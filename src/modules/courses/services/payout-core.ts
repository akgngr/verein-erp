import "server-only";

import { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";

import { exceedsLimit } from "./payout-calc";

type Actor = { id: string; label: string };
type PayoutLimits = { uebungsleiterLimitCents: number; ehrenamtLimitCents: number };

/** Onay: Gutschrift numarası verilir (HA-<yıl>-<sıra>, P2002 retry + atomik DRAFT kilidi — #579). */
export async function approvePayoutCore(
  id: string,
  actor: Actor,
  createError: (code: string) => Error = (code) => new Error(code),
): Promise<string> {
  const db = getDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await db.$transaction(async (tx) => {
        const payout = await tx.courseTeacherPayout.findUnique({ where: { id } });
        if (!payout || payout.status !== "DRAFT") throw createError("courses.payouts.errors.notDraft");
        const year = Number(payout.period.slice(0, 4));
        const last = await tx.courseTeacherPayout.findFirst({ where: { year }, orderBy: { sequence: "desc" }, select: { sequence: true } });
        const sequence = (last?.sequence ?? 0) + 1;
        const number = `HA-${year}-${String(sequence).padStart(4, "0")}`;
        const updated = await tx.courseTeacherPayout.updateMany({
          where: { id, status: "DRAFT" },
          data: { status: "APPROVED", year, sequence, number, approvedAt: new Date(), approvedByLabel: actor.label },
        });
        if (updated.count !== 1) throw createError("courses.payouts.errors.notDraft");
        return number;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 4) {
        continue;
      }
      throw error;
    }
  }
  throw createError("courses.payouts.errors.notDraft");
}

export type PayoutRow = {
  id: string;
  teacherId: string;
  teacherName: string;
  period: string;
  status: "DRAFT" | "APPROVED" | "PAID" | "CANCELLED";
  number: string | null;
  compensation: string;
  sessionCount: number;
  minutes: number;
  amountCents: number;
  bookingNumber: string | null;
  paidAt: Date | null;
  hasPaymentProfile: boolean;
  limitExceeded: boolean;
};

/** Hakediş listesi; onlyTeacherUserId verilirse yalnızca o öğretmenin kayıtları (N+1'siz toplu sorgu — #579). */
export async function listPayoutsCore(
  filter: { period?: string | null; onlyTeacherUserId?: string | null },
  limits: PayoutLimits,
  hasPaymentProfile: (userId: string) => Promise<boolean>,
): Promise<PayoutRow[]> {
  const db = getDb();
  const rows = await db.courseTeacherPayout.findMany({
    where: {
      ...(filter.period ? { period: filter.period } : {}),
      ...(filter.onlyTeacherUserId ? { teacher: { userId: filter.onlyTeacherUserId } } : {}),
    },
    include: { teacher: { select: { firstName: true, lastName: true, userId: true } } },
    orderBy: [{ period: "desc" }, { teacher: { lastName: "asc" } }],
  });
  if (!rows.length) return [];

  const uniqueUserIds = [...new Set(rows.map((row) => row.teacher.userId).filter((uid): uid is string => Boolean(uid)))];
  const uniqueTeacherIds = [...new Set(rows.map((row) => row.teacherId))];
  const uniqueYears = [...new Set(rows.map((row) => row.period.slice(0, 4)))];

  const [profileEntries, yearRows] = await Promise.all([
    Promise.all(uniqueUserIds.map(async (uid) => [uid, await hasPaymentProfile(uid)] as const)),
    db.courseTeacherPayout.findMany({
      where: {
        teacherId: { in: uniqueTeacherIds },
        status: { in: ["DRAFT", "APPROVED", "PAID"] },
        OR: uniqueYears.map((y) => ({ period: { startsWith: y } })),
      },
      select: { teacherId: true, period: true, amountCents: true },
    }),
  ]);

  const profileCache = new Map<string, boolean>(profileEntries);
  const yearTotals = new Map<string, number>();
  for (const yr of yearRows) {
    const key = `${yr.teacherId}:${yr.period.slice(0, 4)}`;
    yearTotals.set(key, (yearTotals.get(key) ?? 0) + yr.amountCents);
  }

  return rows.map((row) => {
    const userId = row.teacher.userId;
    const key = `${row.teacherId}:${row.period.slice(0, 4)}`;
    return {
      id: row.id,
      teacherId: row.teacherId,
      teacherName: `${row.teacher.firstName} ${row.teacher.lastName}`.trim(),
      period: row.period,
      status: row.status,
      number: row.number,
      compensation: row.compensation,
      sessionCount: row.sessionCount,
      minutes: row.minutes,
      amountCents: row.amountCents,
      bookingNumber: row.bookingNumber,
      paidAt: row.paidAt,
      hasPaymentProfile: userId ? (profileCache.get(userId) ?? false) : false,
      limitExceeded: row.status !== "CANCELLED" && exceedsLimit(row.compensation, yearTotals.get(key) ?? 0, limits),
    };
  });
}
