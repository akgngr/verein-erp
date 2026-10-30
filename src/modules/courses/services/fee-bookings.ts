import "server-only";

import type { CoursePaymentMethod, Prisma } from "@prisma/client";

import { createSourcedBooking, getPaymentAccountTargets, reverseSourcedBooking } from "@/modules/accounting/server";
import { ActionError } from "@/modules/auth/server";

/** Kasa ile alınan ödeme kasa hesabına, diğerleri banka hesabına (SEPA, havale, kart). */
function accountKeyFor(method: CoursePaymentMethod): "cashAccountId" | "bankAccountId" {
  return method === "CASH" ? "cashAccountId" : "bankAccountId";
}

/**
 * Tahsilatı muhasebeye gelir fişi olarak yazar (ödeme transaction'ı içinde). Açıklamada
 * kişi adı yerine DATEV Debitor numarası kullanılır (fiş listesinde kişisel veri azaltımı).
 */
export async function bookCoursePayment(
  tx: Prisma.TransactionClient,
  args: {
    actor: { id: string; label: string };
    paymentId: string;
    incomeCategoryId: string | null;
    method: CoursePaymentMethod;
    paidAt: Date;
    amountCents: number;
    courseCode: string;
    debtorNumber: number | null;
    chargeLabel: string;
  },
): Promise<string> {
  if (!args.incomeCategoryId) throw new ActionError("courses.errors.categoryMissing");
  const targets = await getPaymentAccountTargets();
  const booking = await createSourcedBooking({
    tx,
    actor: args.actor,
    type: "INCOME",
    sourceType: "COURSE_FEE",
    sourceId: args.paymentId,
    bookingDate: args.paidAt,
    accountId: targets[accountKeyFor(args.method)],
    categoryId: args.incomeCategoryId,
    amountCents: args.amountCents,
    description: `Kursgebühr ${args.courseCode} – ${args.chargeLabel}${args.debtorNumber ? ` – Debitor ${args.debtorNumber}` : ""}`,
    receiptReference: args.courseCode,
  });
  return booking.bookingNumber;
}

export async function reverseCoursePaymentBooking(
  tx: Prisma.TransactionClient,
  args: { actor: { id: string; label: string }; paymentId: string; reason: string },
): Promise<void> {
  await reverseSourcedBooking({ tx, actor: args.actor, sourceType: "COURSE_FEE", sourceId: args.paymentId, reason: args.reason });
}

/** Fiş açıklaması için dil bağımsız kısa kalem etiketi (DATEV/Buchungstext Almanca kalır). */
export function chargeBookingLabel(charge: { kind: string; sequence: number; total: number; period: string | null }): string {
  if (charge.kind === "MONTH" && charge.period) return `Monat ${charge.period.slice(5)}/${charge.period.slice(0, 4)}`;
  if (charge.kind === "INSTALLMENT") return `Rate ${charge.sequence}/${charge.total}`;
  return "Einmalig";
}
