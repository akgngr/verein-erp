import assert from "node:assert/strict";
import { test } from "node:test";

import { buildCiiInvoice } from "@/modules/accounting/services/einvoice-cii";
import { parseEInvoiceDocument } from "@/modules/accounting/services/einvoice-document";
import { buildXRechnungUbl, type XInvoiceData } from "@/modules/accounting/services/einvoice-out";

const party = { name: "Verein e.V.", street: "Hauptstr. 1", postalCode: "10115", city: "Berlin", countryCode: "DE", vatId: "DE123456789", taxNumber: "12/345/67890", email: "info@verein.test", phone: "030 123", contactName: "Kasse" };
const data: XInvoiceData = {
  number: "R-2026-0001", issueDate: "2026-10-01", dueDate: "2026-10-15", serviceDate: "September 2026", buyerReference: "04011000-1234512345-06", currency: "EUR",
  seller: party, buyer: { ...party, name: "Kunde GmbH", vatId: null, taxNumber: null, email: null, phone: null, contactName: null },
  iban: "DE02 1203 0000 0000 2020 51", bic: null, paymentTerms: "14 Tage netto", note: "Danke <für> Ihren Auftrag", smallBusiness: false,
  lines: [{ position: 1, description: "Beratung <Workshop>", quantity: 2, unit: "Std", unitPriceCents: 5000, netCents: 10000, taxRate: 19 }, { position: 2, description: "Buch", quantity: 1, unit: null, unitPriceCents: 5000, netCents: 5000, taxRate: 7 }],
  byRate: [{ rate: 19, netCents: 10000, taxCents: 1900 }, { rate: 7, netCents: 5000, taxCents: 350 }],
  netCents: 15000, taxCents: 2250, grossCents: 17250, paidCents: 0,
};

for (const [syntax, build] of [["UBL", buildXRechnungUbl], ["CII", buildCiiInvoice]] as const) {
  test(`EI-3 ${syntax}: tam belge yapısı orijinal XML'den okunur`, () => {
    const doc = parseEInvoiceDocument(build(data));
    assert.equal(doc.syntax, syntax);
    assert.equal(doc.typeCode, "380");
    assert.equal(doc.number, "R-2026-0001");
    assert.equal(doc.issueDate, "2026-10-01");
    assert.equal(doc.buyerReference, "04011000-1234512345-06");
    assert.equal(doc.seller.name, "Verein e.V.");
    assert.equal(doc.seller.vatId, "DE123456789");
    assert.equal(doc.seller.taxNumber, "12/345/67890");
    assert.ok(doc.seller.addressLines.some((line) => line.includes("Berlin")));
    assert.equal(doc.seller.email, "info@verein.test");
    assert.equal(doc.buyer.name, "Kunde GmbH");
    assert.equal(doc.lines.length, 2);
    assert.match(doc.lines[0].name + (doc.lines[0].description ?? ""), /Beratung <Workshop>/);
    assert.equal(doc.lines[0].netCents, 10000);
    assert.equal(doc.lines[0].unitPriceCents, 5000);
    assert.equal(doc.lines[0].rate, 19);
    assert.equal(doc.lines[0].unitCode, "HUR");
    assert.deepEqual(doc.taxes.map((tax) => [tax.rate, tax.netCents, tax.taxCents]), [[19, 10000, 1900], [7, 5000, 350]]);
    assert.equal(doc.totals.netCents, 15000);
    assert.equal(doc.totals.taxCents, 2250);
    assert.equal(doc.totals.grossCents, 17250);
    assert.equal(doc.totals.payableCents, 17250);
    assert.equal(doc.payment.iban, "DE02120300000000202051");
    assert.ok(doc.notes.some((note) => note.includes("Danke <für>")));
  });
}

test("EI-3: iptal faturası türü ve ilgili fatura", () => {
  const credit: XInvoiceData = { ...data, number: "ST-2026-0001", typeCode: 381, precedingInvoice: { number: "R-2026-0007", issueDate: "2026-10-01" } };
  for (const xml of [buildXRechnungUbl(credit), buildCiiInvoice(credit)]) {
    const doc = parseEInvoiceDocument(xml);
    assert.equal(doc.typeCode, "381");
    assert.equal(doc.number, "ST-2026-0001");
    assert.equal(doc.precedingInvoice, "R-2026-0007");
    assert.equal(doc.lines.length, 2);
  }
});
