import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { test } from "node:test";

import { buildXRechnungUbl, unitCode, xrechnungIssues, type XInvoiceData } from "../src/modules/accounting/services/einvoice-out";
import { extractEmbeddedInvoiceXml, isEInvoiceXml, parseEInvoice, section14Checks } from "../src/modules/accounting/services/einvoice-in";

const party = { name: "Verein & Co e.V.", street: "Hauptstr. 1", postalCode: "10115", city: "Berlin", countryCode: "DE", vatId: "DE123456789", taxNumber: "12/345/67890", email: "info@verein.de", phone: "030 123", contactName: "Kasse" };
const data: XInvoiceData = {
  number: "R-2026-0001", issueDate: "2026-10-01", dueDate: "2026-10-15", serviceDate: "September 2026", buyerReference: null, currency: "EUR",
  seller: party, buyer: { ...party, name: "Kunde GmbH", vatId: null, taxNumber: null, email: null, phone: null, contactName: null },
  iban: "DE02 1203 0000 0000 2020 51", bic: null, paymentTerms: null, note: null, smallBusiness: false,
  lines: [{ position: 1, description: "Beratung <Workshop>", quantity: 2, unit: "Std", unitPriceCents: 5000, netCents: 10000, taxRate: 19 }, { position: 2, description: "Buch", quantity: 1, unit: null, unitPriceCents: 5000, netCents: 5000, taxRate: 7 }],
  byRate: [{ rate: 19, netCents: 10000, taxCents: 1900 }, { rate: 7, netCents: 5000, taxCents: 350 }],
  netCents: 15000, taxCents: 2250, grossCents: 17250, paidCents: 0,
};

test("XRechnung UBL: zorunlu öğeler, kaçış, toplamlar", () => {
  const xml = buildXRechnungUbl(data);
  assert.match(xml, /xrechnung_3\.0/);
  assert.match(xml, /<cbc:ID>R-2026-0001<\/cbc:ID>/);
  assert.match(xml, /<cbc:BuyerReference>R-2026-0001<\/cbc:BuyerReference>/);
  assert.match(xml, /Beratung &lt;Workshop&gt;/);
  assert.match(xml, /<cbc:PayableAmount currencyID="EUR">172\.50<\/cbc:PayableAmount>/);
  assert.match(xml, /<cbc:ID>DE02120300000000202051<\/cbc:ID>/);
  assert.match(xml, /unitCode="HUR"/);
  assert.equal((xml.match(/<cac:TaxSubtotal>/g) ?? []).length, 2);
  // Kendi okuyucumuzla geri okunabilir.
  const parsed = parseEInvoice(xml);
  assert.equal(parsed.number, "R-2026-0001");
  assert.equal(parsed.grossCents, 17250);
  assert.equal(parsed.sellerVatId, "DE123456789");
  assert.equal(parsed.sellerTaxNumber, "12/345/67890");
  assert.deepEqual(parsed.byRate, data.byRate);
  assert.equal(parsed.lineCount, 2);
});

test("XRechnung eksik alanlar ve § 19", () => {
  assert.deepEqual(xrechnungIssues(data), []);
  const issues = xrechnungIssues({ ...data, iban: null, dueDate: null, seller: { ...party, vatId: null, taxNumber: null, phone: null } });
  assert.deepEqual(issues, ["sellerTaxId", "sellerContact", "iban", "dueOrTerms"]);
  const xml = buildXRechnungUbl({ ...data, smallBusiness: true, byRate: [{ rate: 0, netCents: 15000, taxCents: 0 }], lines: data.lines.map((line) => ({ ...line, taxRate: 0 })), taxCents: 0, grossCents: 15000 });
  assert.match(xml, /<cbc:ID>E<\/cbc:ID><cbc:Percent>0<\/cbc:Percent><cbc:TaxExemptionReason>[^<]*§ 19 UStG/);
  assert.equal(unitCode("Stk."), "H87");
  assert.equal(unitCode("xyz"), "C62");
});

const CII = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
<rsm:ExchangedDocument><ram:ID>LIEF-4711</ram:ID><ram:TypeCode>380</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">20261020</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>
<rsm:SupplyChainTradeTransaction><ram:IncludedSupplyChainTradeLineItem/><ram:ApplicableHeaderTradeAgreement><ram:SellerTradeParty><ram:Name>Bürobedarf Müller GmbH</ram:Name><ram:PostalTradeAddress><ram:PostcodeCode>80331</ram:PostcodeCode><ram:LineOne>Marienplatz 1</ram:LineOne><ram:CityName>München</ram:CityName></ram:PostalTradeAddress><ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">DE987654321</ram:ID></ram:SpecifiedTaxRegistration></ram:SellerTradeParty></ram:ApplicableHeaderTradeAgreement>
<ram:ApplicableHeaderTradeDelivery><ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">20261018</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent></ram:ApplicableHeaderTradeDelivery>
<ram:ApplicableHeaderTradeSettlement><ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode><ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode><ram:PayeePartyCreditorFinancialAccount><ram:IBANID>DE89370400440532013000</ram:IBANID></ram:PayeePartyCreditorFinancialAccount></ram:SpecifiedTradeSettlementPaymentMeans>
<ram:ApplicableTradeTax><ram:CalculatedAmount>47.50</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>250.00</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19</ram:RateApplicablePercent></ram:ApplicableTradeTax>
<ram:SpecifiedTradePaymentTerms><ram:DueDateDateTime><udt:DateTimeString format="102">20261103</udt:DateTimeString></ram:DueDateDateTime></ram:SpecifiedTradePaymentTerms>
<ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>250.00</ram:LineTotalAmount><ram:TaxBasisTotalAmount>250.00</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="EUR">47.50</ram:TaxTotalAmount><ram:GrandTotalAmount>297.50</ram:GrandTotalAmount><ram:DuePayableAmount>297.50</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>
</ram:ApplicableHeaderTradeSettlement></rsm:SupplyChainTradeTransaction></rsm:CrossIndustryInvoice>`;

test("CII (ZUGFeRD/XRechnung-CII) okuma", () => {
  assert.ok(isEInvoiceXml(CII));
  const parsed = parseEInvoice(CII);
  assert.equal(parsed.syntax, "CII");
  assert.equal(parsed.number, "LIEF-4711");
  assert.equal(parsed.issueDate, "2026-10-20");
  assert.equal(parsed.dueDate, "2026-11-03");
  assert.equal(parsed.serviceDate, "2026-10-18");
  assert.equal(parsed.sellerName, "Bürobedarf Müller GmbH");
  assert.equal(parsed.sellerVatId, "DE987654321");
  assert.equal(parsed.sellerAddress, "Marienplatz 1, 80331 München");
  assert.equal(parsed.sellerIban, "DE89370400440532013000");
  assert.deepEqual(parsed.byRate, [{ rate: 19, netCents: 25000, taxCents: 4750 }]);
  assert.equal(parsed.grossCents, 29750);
});

test("ZUGFeRD PDF: gömülü XML akıştan çıkarılır", () => {
  const compressed = deflateSync(Buffer.from(CII, "utf8"));
  const pdf = Buffer.concat([
    Buffer.from("%PDF-1.7\n1 0 obj\n<< /Length 5 >>\nstream\nBT ET\nendstream\nendobj\n2 0 obj\n<< /Type /EmbeddedFile /Subtype /text#2Fxml /Filter /FlateDecode /Length " + compressed.length + " >>\nstream\n", "latin1"),
    compressed,
    Buffer.from("\nendstream\nendobj\n%%EOF", "latin1"),
  ]);
  const xml = extractEmbeddedInvoiceXml(pdf);
  assert.ok(xml);
  assert.equal(parseEInvoice(xml as string).number, "LIEF-4711");
  assert.equal(extractEmbeddedInvoiceXml(Buffer.from("%PDF-1.4\nstream\nBT ET\nendstream\n", "latin1")), null);
});

test("§ 14 UStG kontrolleri (Kleinbetragsrechnung gevşek)", () => {
  const base = { sellerName: "X", sellerAddress: "Y", sellerVatId: null, sellerTaxNumber: null, number: null, issueDate: "2026-10-01", serviceDate: null, byRate: [{ rate: 19 }] };
  assert.ok(section14Checks({ ...base, grossCents: 20000 }).every((check) => check.ok));
  const big = section14Checks({ ...base, grossCents: 30000 });
  assert.deepEqual(big.filter((check) => !check.ok).map((check) => check.key), ["sellerTaxId", "number", "serviceDate"]);
});

import { parseFreeAddress } from "../src/modules/accounting/services/einvoice-out";

test("serbest alıcı adresi ayrıştırma", () => {
  assert.deepEqual(parseFreeAddress("Kunde GmbH\nMusterweg 5\n12345 Musterstadt", "Kunde GmbH"), { street: "Musterweg 5", postalCode: "12345", city: "Musterstadt", countryCode: "DE" });
  assert.deepEqual(parseFreeAddress("Ringstr. 2, A-1010 Wien, Österreich", "X"), { street: "Ringstr. 2", postalCode: "1010", city: "Wien", countryCode: "AT" });
  assert.equal(parseFreeAddress(null, "X").postalCode, null);
});
