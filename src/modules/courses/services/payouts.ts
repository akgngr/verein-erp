import "server-only";

import { Prisma } from "@prisma/client";

import { createSourcedBooking, getPaymentAccountTargets, reverseSourcedBooking } from "@/modules/accounting/server";
import { ActionError, getPaymentProfile } from "@/modules/auth/server";
import { getDb } from "@/shared/db";

import { getCoursesSettings } from "../queries/course-parts";
import { calculatePayout, periodRange, type PayoutLine, type PayoutSession } from "./payout-calc";
import { approvePayoutCore, listPayoutsCore, type PayoutRow } from "./payout-core";

export type { PayoutRow };

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

/** Onay: Gutschrift numarası verilir (HA-<yıl>-<sıra>, P2002 retry + atomik DRAFT kilidi — #579). */
export async function approvePayout(id: string, actor: Actor): Promise<string> {
  return approvePayoutCore(id, actor, (code) => new ActionError(code));
}

/** Ödendi: muhasebeye gider fişi (banka hesabı, hakediş gider kategorisi). Açıklamada ad yok, numara var. */
export async function markPayoutPaid(id: string, paidAt: Date, actor: Actor): Promise<string> {
  const settings = await getCoursesSettings();
  if (!settings.payoutCategoryId) throw new ActionError("courses.payouts.errors.categoryMissing");
  const targets = await getPaymentAccountTargets();
  return getDb().$transaction(async (tx) => {
    const payout = await tx.courseTeacherPayout.findUnique({ where: { id } });
    if (!payout || payout.status !== "APPROVED" || !payout.number) throw new ActionError("courses.payouts.errors.notApproved");
    const claimed = await tx.courseTeacherPayout.updateMany({
      where: { id, status: "APPROVED" },
      data: { status: "PAID", paidAt },
    });
    if (claimed.count !== 1) throw new ActionError("courses.payouts.errors.notApproved");
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
    await tx.courseTeacherPayout.update({ where: { id }, data: { bookingNumber: booking.bookingNumber } });
    return booking.bookingNumber;
  });
}

/** İptal: taslak silinir; onaylı iptal edilir (numara korunur); ödenmişin gider fişi ters kayıtla iptal edilir. */
export async function cancelPayout(id: string, reason: string, actor: Actor): Promise<void> {
  await getDb().$transaction(async (tx) => {
    const payout = await tx.courseTeacherPayout.findUnique({ where: { id } });
    if (!payout || payout.status === "CANCELLED") throw new ActionError("courses.payouts.errors.notFound");
    if (payout.status === "DRAFT") {
      const deleted = await tx.courseTeacherPayout.deleteMany({ where: { id, status: "DRAFT" } });
      if (deleted.count !== 1) throw new ActionError("courses.payouts.errors.notFound");
      return;
    }
    const claimed = await tx.courseTeacherPayout.updateMany({
      where: { id, status: payout.status },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (claimed.count !== 1) throw new ActionError("courses.payouts.errors.notFound");
    if (payout.status === "PAID") await reverseSourcedBooking({ tx, actor, sourceType: SOURCE, sourceId: payout.id, reason });
  });
}

/** Hakediş listesi; onlyTeacherUserId verilirse yalnızca o öğretmenin kayıtları (N+1'siz toplu sorgu — #579). */
export async function listPayouts(filter: { period?: string | null; onlyTeacherUserId?: string | null }): Promise<PayoutRow[]> {
  const settings = await getCoursesSettings();
  return listPayoutsCore(filter, settings, async (uid) => Boolean((await getPaymentProfile(uid))?.iban));
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
