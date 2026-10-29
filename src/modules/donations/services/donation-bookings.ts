import "server-only";

import type { Prisma } from "@prisma/client";

import { createSourcedBooking, donationAccountKeyFor, getDonationBookingTargets, reverseSourcedBooking } from "@/modules/accounting/server";

import { formatDonorNumber } from "./confirmation-numbers";
import { ActionError } from "@/modules/auth/server";

/**
 * Bağış muhasebe fişleri (§ 11 md. 5): bağış kaydının transaction'ı İÇİNDE
 * `tx` ile çağrılır. Normal bağış: TEK gelir fişi (yönteme göre kasa/banka);
 * Aufwandsspende: banka hesabına gelir + gider çifti (bu sırada).
 * Muhasebe hatası (kilit yıl, eksik ayar, kasa kuralı) bağışı DURDURUR.
 */

export type DonationBookingResult = {
  bookingNumber: string;
  waiverBookingNumber: string | null;
};

/** Bağış fiş açıklaması — yalnızca bağışçı NUMARASI (§ 13 gizlilik kuralı). */
export function donationBookingDescription(
  donationNumber: string,
  donorNumber: number,
  kind: "income" | "expense",
): string {
  const base = `Aufwandsspende ${donationNumber} – Spender Nr. ${formatDonorNumber(donorNumber)}`;
  return kind === "income" ? `${base} (Einnahme)` : `${base} (Ausgabe)`;
}

export async function createDonationBookings(
  tx: Prisma.TransactionClient,
  args: {
    actor: { id: string; label: string };
    donationId: string;
    donationNumber: string;
    donorNumber: number;
    receivedAt: Date;
    amountCents: number;
    method: string;
    waivedReimbursement: boolean;
    expenseCategoryId: string | null;
  },
): Promise<DonationBookingResult> {
  const targets = await getDonationBookingTargets();
  const accountKey = donationAccountKeyFor(args.method);
  const accountId = accountKey === "cashAccountId" ? targets.cashAccountId : targets.bankAccountId;

  const description = `Spende ${args.donationNumber} – Spender Nr. ${formatDonorNumber(args.donorNumber)}`;
  const income = await createSourcedBooking({
    tx,
    actor: args.actor,
    type: "INCOME",
    sourceType: "DONATION",
    sourceId: args.donationId,
    bookingDate: args.receivedAt,
    accountId,
    categoryId: targets.donationCategoryId,
    amountCents: args.amountCents,
    description,
    receiptReference: args.donationNumber,
  });

  if (!args.waivedReimbursement) {
    return { bookingNumber: income.bookingNumber, waiverBookingNumber: null };
  }

  // Aufwandsspende: banka hesabına gelir + gider çifti (§ 11 md. 5 md. 3).
  if (!args.expenseCategoryId) {
    throw new ActionError("Aufwandsspende için gider kategorisi zorunludur.");
  }
  const expense = await createSourcedBooking({
    tx,
    actor: args.actor,
    type: "EXPENSE",
    sourceType: "DONATION_WAIVER",
    sourceId: args.donationId,
    bookingDate: args.receivedAt,
    accountId: targets.bankAccountId,
    categoryId: args.expenseCategoryId,
    amountCents: args.amountCents,
    description: donationBookingDescription(args.donationNumber, args.donorNumber, "expense"),
    receiptReference: args.donationNumber,
  });

  return { bookingNumber: income.bookingNumber, waiverBookingNumber: expense.bookingNumber };
}

/**
 * Bağış fişlerinin ters kaydı (§ 11 md. 7): idempotent; gelir + varsa gider fişi.
 * Yıl kilitliyse hata — bağış iptali engellenir.
 */
export async function reverseDonationBookings(
  tx: Prisma.TransactionClient,
  args: {
    actor: { id: string; label: string };
    donationId: string;
    reason: string;
  },
): Promise<void> {
  await reverseSourcedBooking({
    tx,
    actor: args.actor,
    sourceType: "DONATION",
    sourceId: args.donationId,
    reason: args.reason,
  });
  await reverseSourcedBooking({
    tx,
    actor: args.actor,
    sourceType: "DONATION_WAIVER",
    sourceId: args.donationId,
    reason: args.reason,
  });
}
