/** Pure ACC-10 helpers for the live accounting dashboard (no I/O; unit-tested). */

export type OpenDocument = { dueDate: Date | null; grossCents: number; paidCents: number; skontoCents?: number };

/** Remaining open amount of an invoice/payable in cents (never negative). */
export function openCentsOf(doc: OpenDocument): number {
  return Math.max(0, doc.grossCents - doc.paidCents - (doc.skontoCents ?? 0));
}

/** Days between two UTC-midnight dates (b − a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Splits open documents into overdue (due < today) and due within `horizonDays` (today ≤ due ≤ today+horizon).
 * Documents without due date are ignored for the outlook.
 */
export function bucketOpenDocuments(docs: readonly OpenDocument[], today: Date, horizonDays: number): {
  overdue: { count: number; cents: number };
  upcoming: { count: number; cents: number };
} {
  const result = { overdue: { count: 0, cents: 0 }, upcoming: { count: 0, cents: 0 } };
  for (const doc of docs) {
    const open = openCentsOf(doc);
    if (open <= 0 || !doc.dueDate) continue;
    const days = daysBetween(today, doc.dueDate);
    const bucket = days < 0 ? result.overdue : days <= horizonDays ? result.upcoming : null;
    if (!bucket) continue;
    bucket.count += 1;
    bucket.cents += open;
  }
  return result;
}

/**
 * Expected liquidity after the horizon: current balance + receivables due (incl. overdue, as they may still be paid)
 * − payables due (incl. overdue). A simple, explainable cash forecast; not a guarantee.
 */
export function forecastLiquidity(args: { balanceCents: number; receivablesCents: number; payablesCents: number }): number {
  return args.balanceCents + args.receivablesCents - args.payablesCents;
}

/** Relative change in percent (rounded to one decimal); null when the base is zero. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/** Top-n slices plus an aggregated "other" slice. */
export function topSlices<T extends { cents: number }>(rows: readonly T[], n: number): { top: T[]; otherCents: number } {
  const sorted = [...rows].filter((row) => row.cents > 0).sort((a, b) => b.cents - a.cents);
  return { top: sorted.slice(0, n), otherCents: sorted.slice(n).reduce((sum, row) => sum + row.cents, 0) };
}
