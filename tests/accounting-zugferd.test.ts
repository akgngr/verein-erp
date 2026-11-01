import assert from "node:assert/strict";
import { test } from "node:test";

import { PDFDocument } from "pdf-lib";

import { buildCiiInvoice } from "../src/modules/accounting/services/einvoice-cii";
import { extractEmbeddedInvoiceXml, parseEInvoice } from "../src/modules/accounting/services/einvoice-in";
import type { XInvoiceData } from "../src/modules/accounting/services/einvoice-out";
import { toZugferdPdf } from "../src/modules/accounting/services/zugferd-pdf";

const party = { name: "Verein & Co e.V.", street: "Hauptstr. 1", postalCode: "10115", city: "Berlin", countryCode: "DE", vatId: "DE123456789", taxNumber: "12/345/67890", email: "info@verein.de", phone: "030 123", contactName: null };
const data: XInvoiceData = {
  number: "R-2026-0042", issueDate: "2026-10-01", dueDate: "2026-10-15", serviceDate: null, buyerReference: null, currency: "EUR",
  seller: party, buyer: { ...party, name: "Kunde GmbH", vatId: "DE999999999", taxNumber: null, email: null, phone: null },
  iban: "DE02120300000000202051", bic: "BYLADEM1001", paymentTerms: null, note: null, smallBusiness: false,
  lines: [{ position: 1, description: "Beratung", quantity: 2, unit: "h", unitPriceCents: 5000, netCents: 10000, taxRate: 19 }, { position: 2, description: "Buch", quantity: 1, unit: null, unitPriceCents: 5000, netCents: 5000, taxRate: 7 }],
  byRate: [{ rate: 19, netCents: 10000, taxCents: 1900 }, { rate: 7, netCents: 5000, taxCents: 350 }],
  netCents: 15000, taxCents: 2250, grossCents: 17250, paidCents: 2250,
};

test("CII (EN 16931) üret → kendi okuyucuyla geri oku", () => {
  const xml = buildCiiInvoice(data);
  assert.match(xml, /urn:cen\.eu:en16931:2017/);
  assert.match(xml, /<ram:DuePayableAmount>150\.00<\/ram:DuePayableAmount>/);
  assert.match(xml, /<ram:TotalPrepaidAmount>22\.50<\/ram:TotalPrepaidAmount>/);
  assert.match(xml, /Verein &amp; Co e\.V\./);
  const parsed = parseEInvoice(xml);
  assert.equal(parsed.syntax, "CII");
  assert.equal(parsed.number, "R-2026-0042");
  assert.equal(parsed.issueDate, "2026-10-01");
  assert.equal(parsed.dueDate, "2026-10-15");
  assert.equal(parsed.sellerName, "Verein & Co e.V.");
  assert.equal(parsed.sellerVatId, "DE123456789");
  assert.equal(parsed.sellerTaxNumber, "12/345/67890");
  assert.equal(parsed.sellerIban, "DE02120300000000202051");
  assert.deepEqual(parsed.byRate, data.byRate);
  assert.equal(parsed.grossCents, 17250);
  assert.equal(parsed.lineCount, 2);
});

test("ZUGFeRD PDF: XML eki, PDF/A-3 meta verisi, OutputIntent", async () => {
  const base = await PDFDocument.create();
  base.addPage([595, 842]);
  const bytes = await base.save();
  const xml = buildCiiInvoice(data);
  const out = await toZugferdPdf(bytes, xml, { title: "Rechnung R-2026-0042", author: "Verein & Co e.V.", created: new Date("2026-10-01T10:00:00Z") });
  const text = Buffer.from(out).toString("latin1");
  assert.match(text, /factur-x\.xml/);
  assert.match(text, /\/AFRelationship \/Alternative/);
  assert.match(text, /\/AF \[/);
  assert.match(text, /\/OutputIntents/);
  assert.match(text, /<pdfaid:part>3<\/pdfaid:part>/);
  assert.match(text, /<fx:ConformanceLevel>EN 16931<\/fx:ConformanceLevel>/);
  const embedded = extractEmbeddedInvoiceXml(Buffer.from(out));
  assert.ok(embedded);
  assert.equal(parseEInvoice(embedded as string).number, "R-2026-0042");
  // Hâlâ geçerli bir PDF olarak açılır.
  const reloaded = await PDFDocument.load(out);
  assert.equal(reloaded.getPageCount(), 1);
});
