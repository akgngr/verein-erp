import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { buildPain008, earliestCollectionDate, isValidCreditorId, isValidIban, sepaText } from "@/modules/sepa/lib/pain008";

describe("SEPA pain.008", () => {
  test("IBAN and creditor id checks", () => {
    assert.equal(isValidIban("DE89 3704 0044 0532 0130 00"), true);
    assert.equal(isValidIban("DE89370400440532013001"), false);
    assert.equal(isValidCreditorId("DE98ZZZ09999999999"), true);
    assert.equal(isValidCreditorId("DE99ZZZ09999999999"), false);
  });

  test("text is reduced to the SEPA character set", () => {
    assert.equal(sepaText("Müller & Söhne – Beitrag 2026", 70), "Mueller Soehne Beitrag 2026");
  });

  test("document has totals, CORE/RCUR, creditor id and transactions", () => {
    const xml = buildPain008({
      messageId: "LS-2026-0001",
      createdAt: new Date("2026-11-07T10:00:00Z"),
      collectionDate: "2026-11-12",
      creditor: { name: "Test Verein e.V.", iban: "DE89370400440532013000", bic: null, creditorId: "DE98ZZZ09999999999" },
      transactions: [
        { endToEndId: "LS-2026-0001-1", amountCents: 6000, mandateId: "M-UYE-2026-0001", mandateDate: "2026-01-15", debtorName: "Ayşe Yılmaz", debtorIban: "DE02120300000000202051", debtorBic: "BYLADEM1001", remittance: "Mitgliedsbeitrag 2026" },
        { endToEndId: "LS-2026-0001-2", amountCents: 4550, mandateId: "M-UYE-2026-0002", mandateDate: "2026-02-01", debtorName: "Jörg Groß", debtorIban: "DE02500105170137075030", debtorBic: null, remittance: "Mitgliedsbeitrag 2026" },
      ],
    });
    assert.match(xml, /urn:iso:std:iso:20022:tech:xsd:pain\.008\.001\.08/);
    assert.match(xml, /<NbOfTxs>2<\/NbOfTxs><CtrlSum>105\.50<\/CtrlSum>/);
    assert.match(xml, /<LclInstrm><Cd>CORE<\/Cd><\/LclInstrm><SeqTp>RCUR<\/SeqTp>/);
    assert.match(xml, /<ReqdColltnDt>2026-11-12<\/ReqdColltnDt>/);
    assert.match(xml, /<Id>DE98ZZZ09999999999<\/Id><SchmeNm><Prtry>SEPA<\/Prtry>/);
    assert.match(xml, /<MndtId>M-UYE-2026-0001<\/MndtId><DtOfSgntr>2026-01-15<\/DtOfSgntr>/);
    assert.match(xml, /<Nm>Ayse Yilmaz<\/Nm>/);
    assert.match(xml, /<Othr><Id>NOTPROVIDED<\/Id><\/Othr>/);
  });

  test("earliest collection date skips weekends", () => {
    assert.equal(earliestCollectionDate(new Date("2026-11-06T09:00:00Z"), 2), "2026-11-10"); // Fri → Tue
  });
});
