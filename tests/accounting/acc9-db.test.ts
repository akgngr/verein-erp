import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { getDb } from "@/shared/db";
import { getBookingTotals } from "@/modules/accounting/queries/get-booking-totals";
import { getOverdueInvoiceSummary } from "@/modules/accounting/queries/get-overdue-invoice-summary";
import { listYearsWithBookings } from "@/modules/accounting/queries/list-years";

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.AI_TEST_DATABASE_URL !== process.env.DATABASE_URL) {
  throw new Error("Use an isolated database");
}

test("ACC-9 DB: year boundaries, reversed rows, transfers and year-closing row reconcile", { skip: !enabled }, async () => {
  const db = getDb();
  const prefix = `acc9-${randomUUID()}`;
  const accountId = `${prefix}-cash`;
  const counterAccountId = `${prefix}-bank`;
  const incomeCategoryId = `${prefix}-income`;
  const expenseCategoryId = `${prefix}-expense`;

  try {
    await db.accountingAccount.createMany({
      data: [
        { id: accountId, name: `${prefix} Cash`, type: "CASH", openingBalance: "0.00", openingDate: new Date("2096-01-01T00:00:00Z") },
        { id: counterAccountId, name: `${prefix} Bank`, type: "BANK", openingBalance: "0.00", openingDate: new Date("2096-01-01T00:00:00Z") },
      ],
    });
    await db.accountingCategory.createMany({
      data: [
        { id: incomeCategoryId, name: `${prefix} Income`, direction: "INCOME", sphere: "IDEELL" },
        { id: expenseCategoryId, name: `${prefix} Expense`, direction: "EXPENSE", sphere: "IDEELL" },
      ],
    });
    await db.accountingYear.create({
      data: {
        year: 2097,
        lockedAt: new Date("2098-01-15T00:00:00Z"),
        lockedById: prefix,
        lockedByLabel: prefix,
      },
    });

    const common = {
      accountId,
      taxRate: 0,
      taxAmount: "0.00",
      description: prefix,
      createdById: prefix,
      createdByLabel: prefix,
    };
    await db.accountingBooking.createMany({
      data: [
        { ...common, year: 2096, sequence: 9901, bookingNumber: `${prefix}-2096`, type: "INCOME", bookingDate: new Date("2096-12-31T00:00:00Z"), categoryId: incomeCategoryId, amount: "50.00", netAmount: "50.00" },
        { ...common, year: 2097, sequence: 1, bookingNumber: `${prefix}-1`, type: "INCOME", bookingDate: new Date("2097-01-01T00:00:00Z"), categoryId: incomeCategoryId, amount: "100.00", netAmount: "100.00" },
        { ...common, year: 2097, sequence: 2, bookingNumber: `${prefix}-2`, type: "EXPENSE", bookingDate: new Date("2097-12-31T00:00:00Z"), categoryId: expenseCategoryId, amount: "20.00", netAmount: "20.00" },
        { ...common, year: 2097, sequence: 3, bookingNumber: `${prefix}-3`, type: "INCOME", bookingDate: new Date("2097-05-01T00:00:00Z"), categoryId: incomeCategoryId, amount: "999.00", netAmount: "999.00", reversedAt: new Date("2097-05-02T00:00:00Z"), reversedById: prefix, reversedByLabel: prefix, reverseReason: prefix },
        { ...common, year: 2097, sequence: 4, bookingNumber: `${prefix}-4`, type: "TRANSFER", bookingDate: new Date("2097-06-01T00:00:00Z"), categoryId: null, counterAccountId, amount: "10.00", netAmount: "10.00" },
        { ...common, year: 2097, sequence: 5, bookingNumber: `${prefix}-5`, type: "INCOME", bookingDate: new Date("2097-07-01T00:00:00Z"), categoryId: null, amount: "5.00", netAmount: "5.00" },
        { ...common, year: 2098, sequence: 1, bookingNumber: `${prefix}-2098`, type: "INCOME", bookingDate: new Date("2098-01-01T00:00:00Z"), categoryId: incomeCategoryId, amount: "70.00", netAmount: "70.00" },
      ],
    });

    assert.deepEqual(await getBookingTotals(2097), {
      incomeCents: 10_500,
      expenseCents: 2_000,
      netCents: 8_500,
    });

    const closing = (await listYearsWithBookings()).find((row) => row.year === 2097);
    assert.ok(closing);
    assert.equal(closing.bookingCount, 4);
    assert.equal(closing.incomeCents, 10_500);
    assert.equal(closing.expenseCents, 2_000);
    assert.equal(closing.missingReceiptCount, 3);
    assert.equal(closing.lockedByLabel, prefix);
  } finally {
    // Production bookings are append-only by trigger. This test runs only against the
    // isolated CI database; disable user triggers locally in one cleanup transaction.
    await db.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET LOCAL session_replication_role = replica");
      await tx.accountingBooking.deleteMany({ where: { createdById: prefix } });
      await tx.accountingYear.deleteMany({ where: { year: 2097, lockedById: prefix } });
      await tx.accountingCategory.deleteMany({ where: { id: { in: [incomeCategoryId, expenseCategoryId] } } });
      await tx.accountingAccount.deleteMany({ where: { id: { in: [accountId, counterAccountId] } } });
    });
  }
});

test("ACC-9 DB: overdue summary crosses the 250-row page boundary without truncation", { skip: !enabled }, async () => {
  const db = getDb();
  const prefix = `acc9-invoice-${randomUUID()}`;
  try {
    await db.accountingInvoice.createMany({
      data: Array.from({ length: 501 }, (_, index) => ({
        kind: "INVOICE" as const,
        status: "ISSUED" as const,
        issueDate: new Date("1901-01-01T00:00:00Z"),
        dueDate: new Date("1901-01-15T00:00:00Z"),
        recipientName: prefix,
        grossCents: 1_000,
        netCents: 1_000,
        taxCents: 0,
        paidCents: index === 500 ? 1_000 : 100,
        skontoCents: 0,
        createdById: prefix,
        createdByLabel: prefix,
      })),
    });

    const summary = await getOverdueInvoiceSummary(new Date("1902-01-01T00:00:00Z"));
    assert.deepEqual(summary, { count: 500, cents: 450_000 });
  } finally {
    await db.accountingInvoice.deleteMany({ where: { createdById: prefix } });
  }
});

test.after(async () => {
  if (enabled) await getDb().$disconnect();
});
