/** Pure ACC-9 accounting periods for date-only bookings (UTC midnight). */
export type AccountingPeriod = "year" | "quarter" | "month";

/**
 * Returns a half-open [from, until) date range. The year itself is handled
 * by the booking.year filter, so the whole-year range is optional.
 */
export function getBookingPeriodRange(
  year: number,
  period: AccountingPeriod,
  part: number,
): { from: Date; until: Date } | undefined {
  if (!Number.isInteger(year) || year < 1900 || year > 9999) {
    throw new RangeError("ACCOUNTING_INVALID_YEAR");
  }
  if (period === "year") return undefined;
  const maximumPart = period === "quarter" ? 4 : 12;
  if (!Number.isInteger(part) || part < 1 || part > maximumPart) {
    throw new RangeError("ACCOUNTING_INVALID_PERIOD");
  }
  const month = period === "quarter" ? (part - 1) * 3 : part - 1;
  const span = period === "quarter" ? 3 : 1;
  return {
    from: new Date(Date.UTC(year, month, 1)),
    until: new Date(Date.UTC(year, month + span, 1)),
  };
}
