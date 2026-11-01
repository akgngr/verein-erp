import assert from "node:assert/strict";
import { test } from "node:test";

import { detectFormat, parseAmount, parseCamt053, parseCsv, parseDate, parseMt940, transactionKey } from "../src/modules/accounting/services/bank-parsers";
import { suggestMatches } from "../src/modules/accounting/services/bank-matching";

const CAMT = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02"><BkToCstmrStmt><Stmt><Acct><Id><IBAN>DE02120300000000202051</IBAN></Id><Ccy>EUR</Ccy></Acct>
<Ntry><Amt Ccy="EUR">172.50</Amt><CdtDbtInd>CRDT</CdtDbtInd><Sts>BOOK</Sts><BookgDt><Dt>2026-10-30</Dt></BookgDt><ValDt><Dt>2026-10-30</Dt></ValDt>
<NtryDtls><TxDtls><Refs><EndToEndId>E2E-4711</EndToEndId></Refs><RltdPties><Dbtr><Nm>Muster &amp; Söhne GmbH</Nm></Dbtr><DbtrAcct><Id><IBAN>DE89 3704 0044 0532 0130 00</IBAN></Id></DbtrAcct></RltdPties>
<RmtInf><Ustrd>Rechnung R-2026-0007</Ustrd><Ustrd>Danke</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>
<Ntry><Amt Ccy="EUR">59.50</Amt><CdtDbtInd>DBIT</CdtDbtInd><BookgDt><Dt>2026-10-31</Dt></BookgDt><NtryDtls><TxDtls><Refs><EndToEndId>NOTPROVIDED</EndToEndId></Refs>
<RltdPties><Cdtr><Nm>Telekom Deutschland</Nm></Cdtr></RltdPties><RmtInf><Ustrd>Kundennr 123 Oktober</Ustrd></RmtInf></TxDtls></NtryDtls><AcctSvcrRef>ABC1</AcctSvcrRef></Ntry>
</Stmt></BkToCstmrStmt></Document>`;

const MT940 = `:20:STARTUMS
:25:12030000/0000202051
:28C:00001/001
:60F:C261029EUR1000,00
:61:2610301030CR172,50NTRFNONREF//
:86:166?00GUTSCHRIFT?20EREF+E2E-4711?21SVWZ+Rechnung R-2026-?220007?30BYLADEM1001?31DE89370400440532013000?32Muster & Soehne GmbH
:61:2610311031DR59,50NDDTKD123
:86:105?00LASTSCHRIFT?20Kundennr 123 Oktober?32Telekom Deutschland
:62F:C261031EUR1113,00
-`;

const CSV = `"Kontonummer:";"DE02120300000000202051 / Girokonto";
"Von:";"01.10.2026";

"Buchungstag";"Wertstellung";"Buchungstext";"Auftraggeber / Begünstigter";"Verwendungszweck";"Kontonummer";"BLZ";"Betrag (EUR)";"Gläubiger-ID";"Mandatsreferenz";"Kundenreferenz"
"30.10.2026";"30.10.2026";"Gutschrift";"Muster & Söhne GmbH";"Rechnung R-2026-0007";"DE89370400440532013000";"COBADEFFXXX";"172,50";"";"";"E2E-4711"
"31.10.2026";"31.10.2026";"Lastschrift";"Telekom Deutschland";"Kundennr 123 Oktober";"DE11";"X";"-1.059,50";"DE00ZZZ";"M-1";""
"Kontostand";"";"";"";"";"";"";"1.113,00";"";"";""`;

test("tutar ve tarih ayrıştırma", () => {
  assert.equal(parseAmount("1.234,56"), 123456);
  assert.equal(parseAmount("-12,3"), -1230);
  assert.equal(parseAmount("172.50"), 17250);
  assert.equal(parseAmount("1,059.50"), 105950);
  assert.equal(parseDate("31.10.26"), "2026-10-31");
  assert.equal(parseDate("2026-10-31T10:00:00"), "2026-10-31");
});

test("format tespiti", () => {
  assert.equal(detectFormat(CAMT), "CAMT053");
  assert.equal(detectFormat(MT940), "MT940");
  assert.equal(detectFormat(CSV), "CSV");
});

test("CAMT.053", () => {
  const rows = parseCamt053(CAMT);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { bookingDate: "2026-10-30", valueDate: "2026-10-30", amountCents: 17250, currency: "EUR", counterpartyName: "Muster & Söhne GmbH", counterpartyIban: "DE89370400440532013000", purpose: "Rechnung R-2026-0007 Danke", reference: "E2E-4711" });
  assert.equal(rows[1].amountCents, -5950);
  assert.equal(rows[1].counterpartyName, "Telekom Deutschland");
  assert.equal(rows[1].reference, "ABC1");
});

test("MT940", () => {
  const rows = parseMt940(MT940);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].amountCents, 17250);
  assert.equal(rows[0].bookingDate, "2026-10-30");
  assert.equal(rows[0].counterpartyName, "Muster & Soehne GmbH");
  assert.equal(rows[0].counterpartyIban, "DE89370400440532013000");
  assert.equal(rows[0].purpose, "Rechnung R-2026-0007");
  assert.equal(rows[0].reference, "E2E-4711");
  assert.equal(rows[1].amountCents, -5950);
  assert.equal(rows[1].reference, "KD123");
});

test("CSV (ön satırlar ve bakiye satırı atlanır)", () => {
  const rows = parseCsv(CSV);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].counterpartyName, "Muster & Söhne GmbH");
  assert.equal(rows[0].reference, "E2E-4711");
  assert.equal(rows[1].amountCents, -105950);
  assert.equal(rows[1].purpose, "Kundennr 123 Oktober");
});

test("mükerrer anahtar deterministik", () => {
  const [row] = parseCamt053(CAMT);
  assert.equal(transactionKey("acc", row), transactionKey("acc", { ...row }));
  assert.notEqual(transactionKey("acc", row), transactionKey("acc2", row));
});

test("eşleştirme: fatura no + tutar, kural", () => {
  const [credit, debit] = parseCamt053(CAMT);
  const invoices = [
    { id: "i1", number: "R-2026-0007", recipientName: "Muster und Söhne GmbH", openCents: 17250 },
    { id: "i2", number: "R-2026-0008", recipientName: "Andere AG", openCents: 17250 },
    { id: "i3", number: "R-2026-0009", recipientName: "Muster", openCents: 5000 },
  ];
  const rules = [{ id: "r1", field: "COUNTERPARTY" as const, pattern: "telekom", direction: "EXPENSE" as const, categoryId: "cat_tel", taxRate: 19 }];
  const forCredit = suggestMatches(credit, invoices, rules);
  assert.equal(forCredit[0].kind, "invoice");
  assert.deepEqual(forCredit[0].kind === "invoice" && forCredit[0].reasons, ["invoiceNumber", "amount", "name"]);
  assert.equal(forCredit[1].kind === "invoice" && forCredit[1].invoiceId, "i2");
  assert.ok(!forCredit.some((item) => item.kind === "invoice" && item.invoiceId === "i3"));
  const forDebit = suggestMatches(debit, invoices, rules);
  assert.deepEqual(forDebit.map((item) => item.kind), ["rule"]);
});

test("eşleştirme: giden ödeme ↔ açık gelen fatura", () => {
  const debit = { amountCents: -29750, counterpartyName: "Buerobedarf Mueller GmbH", purpose: "RE LIEF-4711 Kd 99" };
  const result = suggestMatches(debit, [], [], [
    { id: "p1", number: "LIEF-4711", supplierName: "Bürobedarf Müller GmbH", openCents: 29750 },
    { id: "p2", number: "X-1", supplierName: "Andere", openCents: 10000 },
  ]);
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].kind === "payable" && result[0].reasons, ["invoiceNumber", "amount", "name"]);
});
