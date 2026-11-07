import "server-only";

import { getDb } from "@/shared/db";

import { bookCoursePayment, chargeBookingLabel, reverseCoursePaymentBooking } from "./fee-bookings";

/** SEPA modülü için: vadesi gelmiş açık kurs ücretleri (ödeyen = Debitor numarası; yetki öğrenciler modülünde). */
export type DebitableCharge = { chargeId: string; dueDate: string; amountCents: number; courseCode: string; label: string; debtorNumber: number | null };

export async function listDebitableCharges(until: Date): Promise<DebitableCharge[]> {
  const rows = await getDb().courseCharge.findMany({
    where: { status: "OPEN", dueDate: { lte: until }, amountCents: { gt: 0 } },
    include: { enrollment: { select: { payerDebtorNumber: true, course: { select: { code: true } } } } },
    orderBy: [{ dueDate: "asc" }],
    take: 5000,
  });
  return rows.map((row) => ({ chargeId: row.id, dueDate: row.dueDate.toISOString().slice(0, 10), amountCents: row.amountCents, courseCode: row.enrollment.course.code, label: chargeBookingLabel(row), debtorNumber: row.enrollment.payerDebtorNumber }));
}

/** Tahsil edilen kalemleri SEPA ödemesi olarak kaydeder ve muhasebeye yazar; açık olmayan kalem atlanır. */
export async function recordSepaChargePayments(items: { chargeId: string; reference: string }[], paidAt: Date, actor: { id: string; label: string }): Promise<Record<string, string>> {
  const db = getDb();
  const settings = await db.coursesSettings.findUnique({ where: { id: "singleton" } });
  const out: Record<string, string> = {};
  for (const item of items) {
    const charge = await db.courseCharge.findUnique({ where: { id: item.chargeId }, include: { enrollment: { include: { course: { select: { code: true } } } } } });
    if (!charge || charge.status !== "OPEN") continue;
    out[item.reference] = await db.$transaction(async (tx) => {
      const payment = await tx.coursePayment.create({ data: { chargeId: charge.id, paidAt, method: "SEPA_DEBIT", amountCents: charge.amountCents, reference: item.reference, recordedById: actor.id, recordedByLabel: actor.label } });
      const number = await bookCoursePayment(tx, { actor, paymentId: payment.id, incomeCategoryId: settings?.incomeCategoryId ?? null, method: "SEPA_DEBIT", paidAt, amountCents: charge.amountCents, courseCode: charge.enrollment.course.code, debtorNumber: charge.enrollment.payerDebtorNumber, chargeLabel: chargeBookingLabel(charge) });
      await tx.coursePayment.update({ where: { id: payment.id }, data: { bookingNumber: number } });
      await tx.courseCharge.update({ where: { id: charge.id }, data: { status: "PAID" } });
      return number;
    });
  }
  return out;
}

/** Rücklastschrift: ödemeyi ve muhasebe fişini ters çevirir, kalem yeniden açılır. */
export async function voidSepaChargePayment(chargeId: string, reference: string, reason: string, actor: { id: string; label: string }): Promise<boolean> {
  const db = getDb();
  const payment = await db.coursePayment.findFirst({ where: { chargeId, reference, reversedAt: null } });
  if (!payment) return false;
  await db.$transaction(async (tx) => {
    await reverseCoursePaymentBooking(tx, { actor, paymentId: payment.id, reason });
    await tx.coursePayment.update({ where: { id: payment.id }, data: { reversedAt: new Date(), reverseReason: reason } });
    await tx.courseCharge.update({ where: { id: chargeId }, data: { status: "OPEN" } });
  });
  return true;
}
