import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { parseEInvoice } from "@/modules/accounting/services/einvoice-in";

// #641 review: a credit note's sign is decided once per document; mixed-sign tax groups keep their relative signs.
const ublCreditNote = (amounts: { base1: string; base2: string; tax: string; net: string; gross: string }) => `<?xml version="1.0" encoding="UTF-8"?>
<CreditNote xmlns="urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
<cbc:ID>GS-1</cbc:ID><cbc:IssueDate>2026-11-01</cbc:IssueDate><cbc:CreditNoteTypeCode>381</cbc:CreditNoteTypeCode><cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>
<cac:AccountingSupplierParty><cac:Party><cac:PartyName><cbc:Name>Lieferant GmbH</cbc:Name></cac:PartyName></cac:Party></cac:AccountingSupplierParty>
<cac:TaxTotal><cbc:TaxAmount currencyID="EUR">${amounts.tax}</cbc:TaxAmount>
<cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">${amounts.base1}</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">${amounts.tax}</cbc:TaxAmount><cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>19</cbc:Percent></cac:TaxCategory></cac:TaxSubtotal>
<cac:TaxSubtotal><cbc:TaxableAmount currencyID="EUR">${amounts.base2}</cbc:TaxableAmount><cbc:TaxAmount currencyID="EUR">0.00</cbc:TaxAmount><cac:TaxCategory><cbc:ID>Z</cbc:ID><cbc:Percent>0</cbc:Percent></cac:TaxCategory></cac:TaxSubtotal>
</cac:TaxTotal>
<cac:LegalMonetaryTotal><cbc:LineExtensionAmount currencyID="EUR">${amounts.net}</cbc:LineExtensionAmount><cbc:TaxExclusiveAmount currencyID="EUR">${amounts.net}</cbc:TaxExclusiveAmount><cbc:TaxInclusiveAmount currencyID="EUR">${amounts.gross}</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="EUR">${amounts.gross}</cbc:PayableAmount></cac:LegalMonetaryTotal>
</CreditNote>`;

const CII_CREDIT_NOTE = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
<rsm:ExchangedDocument><ram:ID>GS-2</ram:ID><ram:TypeCode>381</ram:TypeCode><ram:IssueDateTime><udt:DateTimeString format="102">20261101</udt:DateTimeString></ram:IssueDateTime></rsm:ExchangedDocument>
<rsm:SupplyChainTradeTransaction><ram:ApplicableHeaderTradeAgreement><ram:SellerTradeParty><ram:Name>Lieferant GmbH</ram:Name></ram:SellerTradeParty></ram:ApplicableHeaderTradeAgreement>
<ram:ApplicableHeaderTradeSettlement><ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
<ram:ApplicableTradeTax><ram:CalculatedAmount>19.00</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>100.00</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19</ram:RateApplicablePercent></ram:ApplicableTradeTax>
<ram:ApplicableTradeTax><ram:CalculatedAmount>0.00</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode><ram:BasisAmount>-10.00</ram:BasisAmount><ram:CategoryCode>Z</ram:CategoryCode><ram:RateApplicablePercent>0</ram:RateApplicablePercent></ram:ApplicableTradeTax>
<ram:SpecifiedTradeSettlementHeaderMonetarySummation><ram:LineTotalAmount>90.00</ram:LineTotalAmount><ram:TaxBasisTotalAmount>90.00</ram:TaxBasisTotalAmount><ram:TaxTotalAmount currencyID="EUR">19.00</ram:TaxTotalAmount><ram:GrandTotalAmount>109.00</ram:GrandTotalAmount><ram:DuePayableAmount>109.00</ram:DuePayableAmount></ram:SpecifiedTradeSettlementHeaderMonetarySummation>
</ram:ApplicableHeaderTradeSettlement></rsm:SupplyChainTradeTransaction></rsm:CrossIndustryInvoice>`;

const sumNet = (byRate: Array<{ netCents: number }>) => byRate.reduce((sum, group) => sum + group.netCents, 0);

test("UBL and CII credit notes with mixed-sign groups flip the whole document once", () => {
  for (const xml of [ublCreditNote({ base1: "100.00", base2: "-10.00", tax: "19.00", net: "90.00", gross: "109.00" }), CII_CREDIT_NOTE]) {
    const parsed = parseEInvoice(xml);
    assert.equal(parsed.isCreditNote, true);
    assert.equal(parsed.netCents, -9000);
    assert.equal(parsed.taxCents, -1900);
    assert.equal(parsed.grossCents, -10900);
    assert.equal(parsed.payableCents, -10900);
    assert.deepEqual(parsed.byRate, [{ rate: 19, netCents: -10000, taxCents: -1900 }, { rate: 0, netCents: 1000, taxCents: 0 }]);
    assert.equal(sumNet(parsed.byRate), parsed.netCents, "groups add up to the total (BR-CO-13)");
  }
});

test("a credit note that already states negative totals is left as it is", () => {
  const parsed = parseEInvoice(ublCreditNote({ base1: "-100.00", base2: "10.00", tax: "-19.00", net: "-90.00", gross: "-109.00" }));
  assert.equal(parsed.netCents, -9000);
  assert.deepEqual(parsed.byRate, [{ rate: 19, netCents: -10000, taxCents: -1900 }, { rate: 0, netCents: 1000, taxCents: 0 }]);
});

test("the payable pay dialog accepts a positive refund for a credit note (absolute open amount)", () => {
  const source = fs.readFileSync("src/modules/accounting/components/payable-actions.tsx", "utf8");
  assert.match(source, /const openAbsCents = Math\.abs\(payable\.openCents\)/);
  assert.match(source, /amountCents > openAbsCents/);
  assert.doesNotMatch(source, /amountCents > payable\.openCents/);
});
