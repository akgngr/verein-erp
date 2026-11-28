import "server-only";

import type { Prisma } from "@prisma/client";

import {
  createSourcedBooking,
  donationAccountKeyFor,
  getDonationBookingTargets,
  nextVersionedSourcedBookingId,
  reverseSourcedBooking,
} from "@/modules/accounting/server";

import { formatDonorNumber } from "./confirmation-numbers";
import { ActionError } from "@/modules/auth/server";

/**
 * Bağış muhasebe fişleri (§ 11 md. 5): bağış kaydının transaction'ı İÇİNDE
 * `tx` ile çağrılır. Normal bağış: TEK gelir fişi (yönteme göre kasa/banka);
 * Aufwandsspende: banka hesabına gelir + gider çifti (bu sırada).
 * Muhasebe hatası (kilit yıl, eksik ayar, kasa kuralı) bağışı DURDURUR.
 */

export type DonationBookingResult = {
  bookingId: string;
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
    accountId?: string;
  },
): Promise<DonationBookingResult> {
  const targets = await getDonationBookingTargets();
  const accountKey = donationAccountKeyFor(args.method);
  const accountId =
    args.accountId ??
    (accountKey === "cashAccountId"
      ? targets.cashAccountId
      : targets.bankAccountId);

  const description = args.waivedReimbursement
    ? donationBookingDescription(args.donationNumber, args.donorNumber, "income")
    : `Spende ${args.donationNumber} – Spender Nr. ${formatDonorNumber(args.donorNumber)}`;
  const incomeSourceId = await nextVersionedSourcedBookingId(tx, "DONATION", args.donationId);
  const income = await createSourcedBooking({
    tx,
    actor: args.actor,
    type: "INCOME",
    sourceType: "DONATION",
    sourceId: incomeSourceId,
    bookingDate: args.receivedAt,
    accountId,
    categoryId: targets.donationCategoryId,
    amountCents: args.amountCents,
    description,
    receiptReference: args.donationNumber,
  });

  if (!args.waivedReimbursement) {
    return {
      bookingId: income.id,
      bookingNumber: income.bookingNumber,
      waiverBookingNumber: null,
    };
  }

  // Aufwandsspende: banka hesabına gelir + gider çifti (§ 11 md. 5 md. 3).
  if (!args.expenseCategoryId) {
    throw new ActionError("donations.errors.waiverExpenseRequired");
  }
  const waiverSourceId = await nextVersionedSourcedBookingId(tx, "DONATION_WAIVER", args.donationId);
  const expense = await createSourcedBooking({
    tx,
    actor: args.actor,
    type: "EXPENSE",
    sourceType: "DONATION_WAIVER",
    sourceId: waiverSourceId,
    bookingDate: args.receivedAt,
    accountId: targets.bankAccountId,
    categoryId: args.expenseCategoryId,
    amountCents: args.amountCents,
    description: donationBookingDescription(args.donationNumber, args.donorNumber, "expense"),
    receiptReference: args.donationNumber,
  });

  return {
    bookingId: income.id,
    bookingNumber: income.bookingNumber,
    waiverBookingNumber: expense.bookingNumber,
  };
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
    /** The donation is corrected, not cancelled: its bank receipt stays settled (moved by the caller). */
    replacing?: boolean;
  },
): Promise<{ reversedIncomeIds: string[] }> {
  const income = await reverseSourcedBooking({
    tx,
    actor: args.actor,
    sourceType: "DONATION",
    sourceId: args.donationId,
    reason: args.reason,
    bankSettlement: args.replacing ? "keep" : "reopen",
  });
  await reverseSourcedBooking({
    tx,
    actor: args.actor,
    sourceType: "DONATION_WAIVER",
    sourceId: args.donationId,
    reason: args.reason,
  });
  return { reversedIncomeIds: income.reversedIds };
}
