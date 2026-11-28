import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { reopenBankTransactionForBooking } from "@/modules/accounting/services/bank-reopen";

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
