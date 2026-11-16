import "server-only";

import { getDb } from "@/shared/db";

/** ACC-9: Single booking-total definition shared by the accounting list and overview. */
export async function getBookingTotals(
  year: number,
  range?: { from: Date; until: Date },
): Promise<{ incomeCents: number; expenseCents: number; netCents: number }> {
  const totals = await getDb().accountingBooking.groupBy({
    by: ["type"],
    where: {
      year,
      reversedAt: null,
      type: { not: "TRANSFER" },
      ...(range ? { bookingDate: { gte: range.from, lt: range.until } } : {}),
    },
    _sum: { amount: true },
  });

  let incomeCents = 0;
  let expenseCents = 0;
  for (const total of totals) {
    const cents = Number(total._sum.amount ? total._sum.amount.mul(100).toFixed(0) : 0);
    if (total.type === "INCOME") incomeCents += cents;
    else if (total.type === "EXPENSE") expenseCents += cents;
  }
  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents };
}

/** Date-only accounting bookings are stored at UTC midnight. End bound is exclusive. */
export function getBookingPeriodRange(
  year: number,
  period: "year" | "quarter" | "month",
  part: number,
): { from: Date; until: Date } | undefined {
  if (period === "year") return undefined;
  const month = period === "quarter" ? (part - 1) * 3 : part - 1;
  const span = period === "quarter" ? 3 : 1;
  if (!Number.isInteger(part) || month < 0 || month >= 12) {
    throw new RangeError("ACCOUNTING_INVALID_PERIOD");
  }
  return { from: new Date(Date.UTC(year, month, 1)), until: new Date(Date.UTC(year, month + span, 1)) };
}
