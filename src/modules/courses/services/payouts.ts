import "server-only";

import type { Prisma } from "@prisma/client";

import { createSourcedBooking, getPaymentAccountTargets, reverseSourcedBooking } from "@/modules/accounting/server";
import { ActionError, getPaymentProfile } from "@/modules/auth/server";
import { getDb } from "@/shared/db";

import { getCoursesSettings } from "../queries/course-parts";
import { calculatePayout, exceedsLimit, periodRange, type PayoutLine, type PayoutSession } from "./payout-calc";

const SOURCE = "COURSE_TEACHER_PAYOUT";
type Actor = { id: string; label: string };

/**
 * Öğretmenin dönemdeki (iptal edilmemiş) dersleri: dersin öğretmeni o ise; dersde öğretmen
 * seçilmemişse ve kursun tek öğretmeni o ise.
 */
async function sessionsForTeacher(teacherId: string, period: string): Promise<PayoutSession[]> {
  const { from, to } = periodRange(period);
  const rows = await getDb().courseSession.findMany({
    where: {
      date: { gte: from, lt: to },
      isCancelled: false,
      OR: [{ teacherId }, { teacherId: null, course: { teachers: { some: { teacherId } } } }],
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      teacherId: true,
      course: { select: { code: true, title: true, deletedAt: true, _count: { select: { teachers: true } } } },
    },
  });
  return rows
    .filter((row) => !row.course.deletedAt && (row.teacherId === teacherId || row.course._count.teachers === 1))
    .map((row) => ({ id: row.id, date: row.date.toISOString().slice(0, 10), startTime: row.startTime, endTime: row.endTime, courseCode: row.course.code, courseTitle: row.course.title }));
}

/**
 * Dönemin hakedişlerini hesaplar: ücretli her aktif öğretmen için taslak oluşturur ya da
 * mevcut taslağı yeniden hesaplar. Onaylanmış/ödenmiş hakedişe dokunulmaz.
 */
export async function generatePayouts(period: string, actor: Actor): Promise<{ created: number; updated: number; skipped: number }> {
  const db = getDb();
  const settings = await getCoursesSettings();
  const teachers = await db.courseTeacher.findMany({ where: { isActive: true, compensation: { not: "NONE" }, rateCents: { gt: 0 } } });
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const teacher of teachers) {
    const existing = await db.courseTeacherPayout.findFirst({ where: { teacherId: teacher.id, period, status: { not: "CANCELLED" } } });
    if (existing && existing.status !== "DRAFT") {
      skipped += 1;
      continue;
    }
    const sessions = await sessionsForTeacher(teacher.id, period);
    const calc = calculatePayout(sessions, { rateCents: teacher.rateCents ?? 0, rateUnit: teacher.rateUnit }, settings.defaultSessionMinutes);
    const data = {
      compensation: teacher.compensation,
      rateCents: teacher.rateCents ?? 0,
      rateUnit: teacher.rateUnit,
      sessionCount: calc.lines.length,
      minutes: calc.minutes,
      amountCents: calc.amountCents,
      lines: calc.lines as unknown as Prisma.InputJsonValue,
    };
    if (existing) {
      if (calc.lines.length === 0) await db.courseTeacherPayout.delete({ where: { id: existing.id } });
      else await db.courseTeacherPayout.update({ where: { id: existing.id }, data });
      updated += 1;
    } else if (calc.lines.length > 0) {
      await db.courseTeacherPayout.create({ data: { ...data, teacherId: teacher.id, period, createdById: actor.id, createdByLabel: actor.label } });
      created += 1;
    }
  }
  return { created, updated, skipped };
}

/** Onay: Gutschrift numarası verilir (HA-<yıl>-<sıra>, yıl içinde boşluksuz). */
export async function approvePayout(id: string, actor: Actor): Promise<string> {
  return getDb().$transaction(async (tx) => {
    const payout = await tx.courseTeacherPayout.findUnique({ where: { id } });
    if (!payout || payout.status !== "DRAFT") throw new ActionError("courses.payouts.errors.notDraft");
    const year = Number(payout.period.slice(0, 4));
    const last = await tx.courseTeacherPayout.findFirst({ where: { year }, orderBy: { sequence: "desc" }, select: { sequence: true } });
    const sequence = (last?.sequence ?? 0) + 1;
    const number = `HA-${year}-${String(sequence).padStart(4, "0")}`;
    await tx.courseTeacherPayout.update({ where: { id }, data: { status: "APPROVED", year, sequence, number, approvedAt: new Date(), approvedByLabel: actor.label } });
    return number;
  });
}

/** Ödendi: muhasebeye gider fişi (banka hesabı, hakediş gider kategorisi). Açıklamada ad yok, numara var. */
export async function markPayoutPaid(id: string, paidAt: Date, actor: Actor): Promise<string> {
  const settings = await getCoursesSettings();
  if (!settings.payoutCategoryId) throw new ActionError("courses.payouts.errors.categoryMissing");
  const targets = await getPaymentAccountTargets();
  return getDb().$transaction(async (tx) => {
    const payout = await tx.courseTeacherPayout.findUnique({ where: { id } });
    if (!payout || payout.status !== "APPROVED" || !payout.number) throw new ActionError("courses.payouts.errors.notApproved");
    const booking = await createSourcedBooking({
      tx,
      actor,
      type: "EXPENSE",
      sourceType: SOURCE,
      sourceId: payout.id,
      bookingDate: paidAt,
      accountId: targets.bankAccountId,
      categoryId: settings.payoutCategoryId,
      amountCents: payout.amountCents,
      description: `Honorar ${payout.number} – ${payout.period.slice(5)}/${payout.period.slice(0, 4)}`, // i18n-ignore (Buchungstext Almanca, DATEV)
      receiptReference: payout.number,
    });
    await tx.courseTeacherPayout.update({ where: { id }, data: { status: "PAID", paidAt, bookingNumber: booking.bookingNumber } });
    return booking.bookingNumber;
  });
}

/** İptal: taslak silinir; onaylı iptal edilir (numara korunur); ödenmişin gider fişi ters kayıtla iptal edilir. */
export async function cancelPayout(id: string, reason: string, actor: Actor): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const payout = await tx.courseTeacherPayout.findUnique({ where: { id } });
    if (!payout || payout.status === "CANCELLED") throw new ActionError("courses.payouts.errors.notFound");
    if (payout.status === "DRAFT") {
      await tx.courseTeacherPayout.delete({ where: { id } });
      return;
    }
    if (payout.status === "PAID") await reverseSourcedBooking({ tx, actor, sourceType: SOURCE, sourceId: payout.id, reason });
    await tx.courseTeacherPayout.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
  });
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

/** Hakediş listesi; onlyTeacherUserId verilirse yalnızca o öğretmenin kayıtları. */
export async function listPayouts(filter: { period?: string | null; onlyTeacherUserId?: string | null }): Promise<PayoutRow[]> {
  const db = getDb();
  const settings = await getCoursesSettings();
  const rows = await db.courseTeacherPayout.findMany({
    where: {
      ...(filter.period ? { period: filter.period } : {}),
      ...(filter.onlyTeacherUserId ? { teacher: { userId: filter.onlyTeacherUserId } } : {}),
    },
    include: { teacher: { select: { firstName: true, lastName: true, userId: true } } },
    orderBy: [{ period: "desc" }, { teacher: { lastName: "asc" } }],
  });
  const profileCache = new Map<string, boolean>();
  const yearTotals = new Map<string, number>();
  const result: PayoutRow[] = [];
  for (const row of rows) {
    const userId = row.teacher.userId;
    if (userId && !profileCache.has(userId)) profileCache.set(userId, Boolean((await getPaymentProfile(userId))?.iban));
    const key = `${row.teacherId}:${row.period.slice(0, 4)}`;
    if (!yearTotals.has(key)) {
      const sum = await db.courseTeacherPayout.aggregate({
        where: { teacherId: row.teacherId, period: { startsWith: row.period.slice(0, 4) }, status: { in: ["DRAFT", "APPROVED", "PAID"] } },
        _sum: { amountCents: true },
      });
      yearTotals.set(key, sum._sum.amountCents ?? 0);
    }
    result.push({
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
      limitExceeded: row.status !== "CANCELLED" && exceedsLimit(row.compensation, yearTotals.get(key) ?? 0, settings),
    });
  }
  return result;
}

/** PDF için: hakediş + öğretmenin ödeme profili (IBAN vb. yalnızca bellekte, şifreli kaynaktan). */
export async function getPayoutForPdf(id: string) {
  const payout = await getDb().courseTeacherPayout.findUnique({
    where: { id },
    include: { teacher: { select: { firstName: true, lastName: true, userId: true, email: true } } },
  });
  if (!payout) return null;
  const profile = payout.teacher.userId ? await getPaymentProfile(payout.teacher.userId) : null;
  return { payout: { ...payout, lines: payout.lines as unknown as PayoutLine[] }, profile };
}
