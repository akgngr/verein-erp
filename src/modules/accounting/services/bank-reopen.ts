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
