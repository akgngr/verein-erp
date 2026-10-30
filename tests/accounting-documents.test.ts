import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";

import { DOCUMENT_STRINGS } from "../src/modules/accounting/pdf/document-strings";
import { BookingListDocument } from "../src/modules/accounting/pdf/booking-list-document";
import { InvoiceDocument } from "../src/modules/accounting/pdf/invoice-document";
import { VoucherDocument } from "../src/modules/accounting/pdf/voucher-document";
import type { InvoiceDetail } from "../src/modules/accounting/queries/invoices";
import { calculateInvoiceTotals } from "../src/modules/accounting/services/invoice-calc";
import type { BookingDetail } from "../src/modules/accounting/types";
import { registerSharedPdfFonts } from "../src/shared/pdf/fonts";

const org = { name: "Kulturverein Beispiel e.V.", street: "Hauptstraße 1", postalCode: "60311", city: "Frankfurt", taxNumber: "045 123 45678", taxOffice: "Frankfurt V" };
const out = process.env.PDF_OUT_DIR;
const save = (name: string, buffer: Buffer) => {
  if (out) fs.writeFileSync(`${out}/${name}.pdf`, buffer);
};

const booking: BookingDetail = {
  id: "b1", bookingNumber: "B-2026-0042", type: "INCOME", bookingDate: new Date("2026-03-14T00:00:00Z"), accountName: "Kasse",
  transferLine: null, categoryName: "Kursgebühren", categorySphere: "PURPOSE_OPERATION", project: null, amountCents: 12550,
  description: "Kursgebühr März – Deutschkurs A1", counterparty: "Ayşe Yılmaz", receiptReference: "R-2026-0007", fileCount: 0,
  hasReceipt: true, reversedAt: null, reverseReason: null, sourceType: null, year: 2026, sequence: 42, accountId: "a1",
  counterAccountId: null, categoryId: "c1", projectId: null, createdAt: new Date(), createdById: "u1", createdByLabel: "Admin",
  updatedByLabel: null, updatedAt: new Date(), files: [],
};

const invoice: InvoiceDetail = {
  id: "i1", kind: "INVOICE", status: "ISSUED", number: "R-2026-0007", issueDate: new Date("2026-03-01T00:00:00Z"),
  dueDate: new Date("2026-03-15T00:00:00Z"), recipientName: "Stadtteilschule Nord", subject: "Raummiete Saal", grossCents: 0, overdue: false,
  serviceDate: "Februar 2026", recipientAddress: "Schulweg 5\n60433 Frankfurt", recipientEmail: null, introText: "Für die Nutzung unserer Räume berechnen wir:",
  footerText: "Vielen Dank!", taxNote: null, netCents: 0, taxCents: 0, categoryId: null, bookingId: null, bookingNumber: null,
  sourceProformaId: null, sourceProformaNumber: null, convertedInvoiceId: null, issuedAt: new Date(), paidAt: null, cancelledAt: null,
  cancelReason: null, createdByLabel: "Admin", createdAt: new Date(),
  lines: [
    { id: "l1", position: 1, description: "Saalmiete (Std.)", quantity: 4, unit: "Std.", unitPriceCents: 2500, taxRate: 19, totalCents: 10000 },
    { id: "l2", position: 2, description: "Getränkepauschale", quantity: 1.5, unit: null, unitPriceCents: 1999, taxRate: 7, totalCents: 2999 },
  ],
};

describe("Muhasebe belgeleri", () => {
  test("fatura toplamları: oran başına KDV yuvarlanır", () => {
    const totals = calculateInvoiceTotals([
      { quantity: 4, unitPriceCents: 2500, taxRate: 19 },
      { quantity: 1.5, unitPriceCents: 1999, taxRate: 7 },
      { quantity: 1, unitPriceCents: 1000, taxRate: 0 },
    ]);
    assert.deepEqual(totals.lineTotals, [10000, 2999, 1000]);
    assert.equal(totals.netCents, 13999);
    assert.equal(totals.taxCents, 1900 + 210);
    assert.equal(totals.grossCents, 16109);
  });

});
