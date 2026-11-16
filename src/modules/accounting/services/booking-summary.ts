export type GrossBookingSummaryInput = {
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amountCents: number;
  categoryId: string | null;
};

export function summarizeGrossBookings(rows: readonly GrossBookingSummaryInput[]) {
  const bookingTotals = { incomeCents: 0, expenseCents: 0, netCents: 0 };
  const uncategorized = { incomeCents: 0, expenseCents: 0 };

  for (const row of rows) {
    if (row.type === "TRANSFER") continue;
    if (row.type === "INCOME") {
      bookingTotals.incomeCents += row.amountCents;
      if (!row.categoryId) uncategorized.incomeCents += row.amountCents;
    } else {
      bookingTotals.expenseCents += row.amountCents;
      if (!row.categoryId) uncategorized.expenseCents += row.amountCents;
    }
  }
  bookingTotals.netCents = bookingTotals.incomeCents - bookingTotals.expenseCents;
  return { bookingTotals, uncategorized };
}
