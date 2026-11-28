import type { Prisma } from "@prisma/client";

/**
 * Reopen only module-managed single-booking settlements. The conditional update
 * matches the complete stored ID, not a substring, and cannot clear a newer
 * reconciliation. All three cross-module bank settlement modes store one ID.
 * Caller must reverse the booking and write the journal in the same transaction.
 */
export async function reopenBankTransactionForBooking(
  tx: Pick<Prisma.TransactionClient, "accountingBankTransaction">,
  bookingId: string,
): Promise<number> {
  const result = await tx.accountingBankTransaction.updateMany({
    where: { status: "BOOKED", bookingIds: bookingId, invoiceId: null },
    data: { status: "OPEN", bookingIds: null, invoiceId: null },
  });
  return result.count;
}

/**
 * A corrected source booking replaces the reversed one but still represents the same bank receipt
 * (e.g. a donation whose date changed). Move the settlement to the replacement instead of reopening
 * it, so the receipt cannot be reconciled a second time. Same guards as the reopen.
 */
export async function transferBankSettlement(
  tx: Pick<Prisma.TransactionClient, "accountingBankTransaction">,
  fromBookingId: string,
  toBookingId: string,
): Promise<number> {
  const result = await tx.accountingBankTransaction.updateMany({
    where: { status: "BOOKED", bookingIds: fromBookingId, invoiceId: null },
    data: { bookingIds: toBookingId },
  });
  return result.count;
}
