/**
 * Pure dues payment & overpayment validation rules (no Next.js / DB imports).
 */
export type OverpaymentCheckResult =
  | { ok: true; remainingAfterCents: number | null }
  | { ok: false; remainingOpenCents: number; excessCents: number };

/**
 * Checks whether a payment of `paymentCents` exceeds the remaining open balance
 * of a `MemberDue` row. If `amountDueCents` is null (no annual due record exists
 * for that year), the payment is permitted.
 */
export function checkDueOverpayment(
  amountDueCents: number | null,
  alreadyPaidCents: number,
  paymentCents: number,
): OverpaymentCheckResult {
  if (amountDueCents === null) {
    return { ok: true, remainingAfterCents: null };
  }
  const remainingOpenCents = Math.max(0, amountDueCents - alreadyPaidCents);
  if (paymentCents > remainingOpenCents) {
    return {
      ok: false,
      remainingOpenCents,
      excessCents: paymentCents - remainingOpenCents,
    };
  }
  return {
    ok: true,
    remainingAfterCents: remainingOpenCents - paymentCents,
  };
}
