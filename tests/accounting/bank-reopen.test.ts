import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { reopenBankTransactionForBooking, transferBankSettlement } from "@/modules/accounting/services/bank-reopen";

test("reopen only the exact booked single-settlement row, never unrelated or invoice rows", async () => {
  const rows = [
    { status: "BOOKED", bookingIds: "course-1", invoiceId: null },
    { status: "BOOKED", bookingIds: "course-10", invoiceId: null },
    { status: "BOOKED", bookingIds: "course-1,other", invoiceId: null },
    { status: "BOOKED", bookingIds: "course-1", invoiceId: "invoice-1" },
    { status: "IGNORED", bookingIds: "course-1", invoiceId: null },
    { status: "BOOKED", bookingIds: "donation-1", invoiceId: null },
    { status: "BOOKED", bookingIds: "member-1", invoiceId: null },
  ];
  const tx = {
    accountingBankTransaction: {
      async updateMany({ where, data }: { where: { status: string; bookingIds: string; invoiceId: null }; data: { status: string; bookingIds: null; invoiceId: null } }) {
        const matches = rows.filter(row => row.status === where.status && row.bookingIds === where.bookingIds && row.invoiceId === where.invoiceId);
        matches.forEach(row => Object.assign(row, data));
        return { count: matches.length };
      },
    },
  } as unknown as Prisma.TransactionClient;
  for (const id of ["course-1", "donation-1", "member-1"]) {
    assert.equal(await reopenBankTransactionForBooking(tx, id), 1);
    assert.equal(await reopenBankTransactionForBooking(tx, id), 0);
  }
  assert.deepEqual(rows.map(row => row.status), ["OPEN", "BOOKED", "BOOKED", "BOOKED", "IGNORED", "OPEN", "OPEN"]);
  for (const index of [0, 5, 6]) assert.deepEqual(rows[index], { status: "OPEN", bookingIds: null, invoiceId: null });
});

test("reopening propagates transaction failure rather than hiding it", async () => {
  const tx = { accountingBankTransaction: { async updateMany() { throw new Error("database failure"); } } } as unknown as Prisma.TransactionClient;
  await assert.rejects(reopenBankTransactionForBooking(tx, "booking-1"), /database failure/);
});

test("a corrected donation moves its bank settlement to the replacement instead of reopening it", async () => {
  const rows = [
    { status: "BOOKED", bookingIds: "donation-old", invoiceId: null as string | null },
    { status: "BOOKED", bookingIds: "donation-old,other", invoiceId: null as string | null },
    { status: "OPEN", bookingIds: null as string | null, invoiceId: null as string | null },
  ];
  const tx = {
    accountingBankTransaction: {
      async updateMany({ where, data }: { where: { status: string; bookingIds: string; invoiceId: null }; data: { bookingIds: string } }) {
        const matches = rows.filter(row => row.status === where.status && row.bookingIds === where.bookingIds && row.invoiceId === where.invoiceId);
        matches.forEach(row => Object.assign(row, data));
        return { count: matches.length };
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.equal(await transferBankSettlement(tx, "donation-old", "donation-new"), 1);
  assert.deepEqual(rows[0], { status: "BOOKED", bookingIds: "donation-new", invoiceId: null });
  assert.equal(rows[1].bookingIds, "donation-old,other", "multi-booking rows are left alone");

  const fs = await import("node:fs");
  const sourced = fs.readFileSync("src/modules/accounting/services/sourced-bookings.ts", "utf8");
  assert.ok(sourced.includes('input.bankSettlement !== "keep"'), "a replacement keeps the settlement");
  const action = fs.readFileSync("src/modules/donations/actions/donation-actions.ts", "utf8");
  assert.ok(action.includes("replacing: !isInKind"), "a corrected cash donation is a replacement");
  assert.ok(action.includes("await transferBankSettlement(tx, reversedId, bookings.bookingId)"), "the settlement moves to the new income booking");
});

