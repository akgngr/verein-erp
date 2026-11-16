import assert from "node:assert/strict";
import { test } from "node:test";

import { getBookingPeriodRange } from "@/modules/accounting/services/dashboard-period";
import { summarizeOverdueInvoices } from "@/modules/accounting/services/dashboard-overdue";
import { summarizeGrossBookings } from "@/modules/accounting/services/booking-summary";

test("ACC-9 month range is inclusive of day one and excludes next month day one", () => {
  const range = getBookingPeriodRange(2026, "month", 2);
  assert.deepEqual(range, {
    from: new Date("2026-02-01T00:00:00.000Z"),
    until: new Date("2026-03-01T00:00:00.000Z"),
  });
  assert.ok(new Date("2026-02-28T00:00:00.000Z").getTime() < range!.until.getTime());
  assert.ok(new Date("2026-03-01T00:00:00.000Z").getTime() >= range!.until.getTime());
});

test("ACC-9 fourth quarter spans Oct 1 through Dec 31 only", () => {
  assert.deepEqual(getBookingPeriodRange(2026, "quarter", 4), {
    from: new Date("2026-10-01T00:00:00.000Z"),
    until: new Date("2027-01-01T00:00:00.000Z"),
  });
  assert.equal(getBookingPeriodRange(2026, "year", 1), undefined);
});

test("ACC-9 rejects invalid months, quarters and years", () => {
  for (const part of [-1, 0, 5, 6, 10, 13, 1.5]) {
    if (part < 1 || part > 4 || !Number.isInteger(part)) {
      assert.throws(() => getBookingPeriodRange(2026, "quarter", part), { name: "RangeError" });
    }
  }
  for (const part of [-1, 0, 13, 1.1, Number.NaN]) {
    assert.throws(() => getBookingPeriodRange(2026, "month", part), { name: "RangeError" });
  }
  assert.throws(() => getBookingPeriodRange(0, "month", 1), { name: "RangeError" });
  assert.throws(() => getBookingPeriodRange(10000, "quarter", 1), { name: "RangeError" });
});

test("ACC-9 overdue totals use each invoice open amount, ignoring fully paid and overpaid invoices", () => {
  assert.deepEqual(
    summarizeOverdueInvoices([
      { grossCents: 12000, paidCents: 5000, skontoCents: 1000 },
      { grossCents: 2000, paidCents: 2000, skontoCents: 0 },
      { grossCents: 1000, paidCents: 2000, skontoCents: 0 },
      { grossCents: 4000, paidCents: 0, skontoCents: 0 },
    ]),
    { count: 2, cents: 10000 },
  );
  assert.deepEqual(summarizeOverdueInvoices([]), { count: 0, cents: 0 });
});


test("ACC-9 gross KPI reconciliation keeps uncategorized bookings visible without inventing a sphere", () => {
  assert.deepEqual(
    summarizeGrossBookings([
      { type: "INCOME", amountCents: 12000, categoryId: "cat-income" },
      { type: "INCOME", amountCents: 3000, categoryId: null },
      { type: "EXPENSE", amountCents: 2500, categoryId: "cat-expense" },
      { type: "EXPENSE", amountCents: 500, categoryId: null },
      { type: "TRANSFER", amountCents: 999999, categoryId: null },
    ]),
    {
      bookingTotals: { incomeCents: 15000, expenseCents: 3000, netCents: 12000 },
      uncategorized: { incomeCents: 3000, expenseCents: 500 },
    },
  );
});
