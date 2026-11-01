import assert from "node:assert/strict";
import { test } from "node:test";

import { defaultInterestRate, dunningFeeCents, lateInterestCents, nextDunningLevel } from "../src/modules/accounting/services/dunning";
import { buildPain001, isValidIban, sepaText } from "../src/modules/accounting/services/sepa";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

test("ihtar kademesi", () => {
  assert.equal(nextDunningLevel({ dueDate: d("2026-10-15"), today: d("2026-10-15"), last: null, intervalDays: 14 }), null);
  assert.equal(nextDunningLevel({ dueDate: d("2026-10-15"), today: d("2026-10-16"), last: null, intervalDays: 14 }), 1);
  assert.equal(nextDunningLevel({ dueDate: d("2026-10-15"), today: d("2026-10-25"), last: { level: 1, dunningDate: d("2026-10-16") }, intervalDays: 14 }), null);
  assert.equal(nextDunningLevel({ dueDate: d("2026-10-15"), today: d("2026-10-30"), last: { level: 1, dunningDate: d("2026-10-16") }, intervalDays: 14 }), 2);
  assert.equal(nextDunningLevel({ dueDate: d("2026-01-01"), today: d("2026-12-01"), last: { level: 3, dunningDate: d("2026-03-01") }, intervalDays: 14 }), null);
});

test("§ 288 BGB faiz ve ücret", () => {
  assert.equal(defaultInterestRate(1.27, false), 6.27);
  assert.equal(defaultInterestRate(1.27, true), 10.27);
  assert.equal(defaultInterestRate(-0.88, false), 4.12);
  // 1.000 € × %10 × 73/365 = 20 €
  assert.equal(lateInterestCents(100_000, 10, d("2026-01-01"), d("2026-03-15")), 2000);
  assert.equal(lateInterestCents(100_000, 10, d("2026-03-15"), d("2026-03-15")), 0);
  assert.equal(dunningFeeCents(1, { reminder: 0, first: 500, second: 1000 }), 0);
  assert.equal(dunningFeeCents(3, { reminder: 0, first: 500, second: 1000 }), 1000);
});

test("IBAN kontrolü", () => {
  assert.ok(isValidIban("DE89 3704 0044 0532 0130 00"));
  assert.ok(isValidIban("DE02120300000000202051"));
  assert.ok(!isValidIban("DE89370400440532013001"));
  assert.ok(!isValidIban("XX00"));
});

test("pain.001: toplamlar, karakter kümesi, BIC'siz", () => {
  assert.equal(sepaText("Bürobedarf Müller & Söhne <GmbH>", 70), "Buerobedarf Mueller Soehne GmbH");
  const xml = buildPain001({
    messageId: "ZL-2026-11-01-1",
    createdAt: new Date("2026-11-01T10:00:00Z"),
    executionDate: "2026-11-03",
    debtor: { name: "Test Verein e.V.", iban: "DE02120300000000202051", bic: null },
    payments: [
      { endToEndId: "LIEF-4711", amountCents: 29750, creditorName: "Bürobedarf Müller GmbH", creditorIban: "DE89 3704 0044 0532 0130 00", creditorBic: null, remittance: "Rechnung LIEF-4711" },
      { endToEndId: "X-2", amountCents: 1000, creditorName: "Andere", creditorIban: "DE89370400440532013000", creditorBic: "COBADEFFXXX", remittance: "X-2" },
    ],
  });
  assert.match(xml, /pain\.001\.001\.09/);
  assert.equal((xml.match(/<NbOfTxs>2<\/NbOfTxs>/g) ?? []).length, 2);
  assert.equal((xml.match(/<CtrlSum>307\.50<\/CtrlSum>/g) ?? []).length, 2);
  assert.match(xml, /<Nm>Buerobedarf Mueller GmbH<\/Nm>/);
  assert.match(xml, /<IBAN>DE89370400440532013000<\/IBAN>/);
  assert.match(xml, /<Othr><Id>NOTPROVIDED<\/Id><\/Othr>/);
  assert.match(xml, /<BICFI>COBADEFFXXX<\/BICFI>/);
  assert.match(xml, /<ReqdExctnDt><Dt>2026-11-03<\/Dt><\/ReqdExctnDt>/);
});
