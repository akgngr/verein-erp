export interface BankTransactionClaimClient {
  accountingBankTransaction: {
    updateMany(args: {
      where: { id: string; status: "OPEN" };
      data: { status: "BOOKED" };
    }): Promise<{ count: number }>;
  };
}

/**
 * Atomically claims an `OPEN` bank transaction row inside the reconciliation
 * transaction before any downstream invoice, payable, member-due, course-charge,
 * or donation settlement is executed.
 *
 * Under PostgreSQL READ COMMITTED isolation, concurrent callers racing on the
 * same bank row serialize on this conditional UPDATE; only the first caller
 * observes `count === 1` (`true`) while subsequent callers re-evaluate
 * `status = 'OPEN'` after commit and receive `false`.
 */
export async function claimOpenBankTransaction(
  tx: BankTransactionClaimClient,
  bankTransactionId: string,
): Promise<boolean> {
  const claimed = await tx.accountingBankTransaction.updateMany({
    where: { id: bankTransactionId, status: "OPEN" },
    data: { status: "BOOKED" },
  });
  return claimed.count === 1;
}
