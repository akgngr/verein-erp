import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildDatevAccountLabelsCsv,
  buildDatevBookingsCsv,
  checkSmallBusiness,
  computeEuer,
  computeUstva,
  datevIssues,
  datevTaxKey,
  vatPeriods,
  type TaxBookingRow,
} from "../src/modules/accounting/services/tax-reports";

const row = (over: Partial<TaxBookingRow>): TaxBookingRow => ({
  id: "b1",
  bookingNumber: "B-2026-0001",
  type: "INCOME",
  bookingDate: new Date("2026-03-15T00:00:00Z"),
  description: "Beratung",
  receiptReference: "RE-1",
  amountCents: 11900,
  netCents: 10000,
  taxCents: 1900,
  taxRate: 19,
  accountNumber: "1200",
  accountName: "Bank",
  counterAccountNumber: null,
  counterAccountName: null,
  categoryId: "c1",
  categoryName: "Erlöse 19 %",
  categoryNumber: "8400",
  ...over,
});

const decode = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");
const opts = { consultantNo: "1234567", clientNo: "12345", fiscalYearStart: new Date("2026-01-01T00:00:00Z"), from: new Date("2026-01-01T00:00:00Z"), to: new Date("2026-03-31T00:00:00Z"), accountLength: 4, useTaxKeys: false, label: "Test", now: new Date("2026-04-01T10:00:00Z") };

test("DATEV Buchungsstapel: EXTF başlığı, S/H, Belegdatum, brüt tutar", () => {
  const csv = decode(buildDatevBookingsCsv([
    row({}),
    row({ id: "b2", bookingNumber: "B-2026-0002", type: "EXPENSE", amountCents: 10700, netCents: 10000, taxCents: 700, taxRate: 7, categoryNumber: "4930", bookingDate: new Date("2026-02-01T00:00:00Z") }),
    row({ id: "b3", bookingNumber: "B-2026-0003", type: "TRANSFER", amountCents: 5000, taxRate: 0, accountNumber: "1200", counterAccountNumber: "1000", categoryNumber: null }),
  ], opts)).split("\r\n");
  assert.match(csv[0], /^"EXTF";700;21;"Buchungsstapel";13;20260401100000000;;"RE";"";"";1234567;12345;20260101;4;20260101;20260331;"Test";"";1;0;0;"EUR"$/);
  assert.equal(csv[2], '119,00;"S";"EUR";;;;1200;8400;"";1503;"B-2026-0001";"RE-1";;"Beratung"');
  assert.equal(csv[3].split(";").slice(0, 10).join(";"), '107,00;"H";"EUR";;;;1200;4930;"";0102');
  assert.equal(csv[4].split(";").slice(0, 8).join(";"), '50,00;"S";"EUR";;;;1000;1200');
});

test("BU-Schlüssel yalnızca ayarda açıksa yazılır", () => {
  assert.equal(datevTaxKey("INCOME", 19), "3");
  assert.equal(datevTaxKey("EXPENSE", 7), "8");
  assert.equal(datevTaxKey("TRANSFER", 19), "");
  const csv = decode(buildDatevBookingsCsv([row({})], { ...opts, useTaxKeys: true })).split("\r\n");
  assert.equal(csv[2].split(";")[8], '"3"');
});

test("DATEV ön kontrol: eksik hesap numaraları", () => {
  const issues = datevIssues([row({ accountNumber: null }), row({ id: "x", categoryNumber: null }), row({ id: "t", type: "TRANSFER", counterAccountNumber: null })]);
  assert.deepEqual(issues.map((issue) => issue.reason), ["accountMissing", "categoryMissing", "counterMissing"]);
});

test("Kontenbeschriftungen: tekil ve sıralı", () => {
  const csv = decode(buildDatevAccountLabelsCsv([{ number: "8400", name: "Erlöse" }, { number: "1200", name: "Bank" }, { number: "8400", name: "Erlöse" }], opts)).split("\r\n");
  assert.equal(csv[2], '1200;"Bank";"de-DE"');
  assert.equal(csv[3], '8400;"Erlöse";"de-DE"');
  assert.equal(csv.length, 5);
});

test("UStVA: Kz 81/86 tam Euro matrah, Kz 66 Vorsteuer, Kz 83", () => {
  const result = computeUstva([
    row({ netCents: 10050, taxCents: 1910, amountCents: 11960 }),
    row({ id: "b2", taxRate: 7, netCents: 20000, taxCents: 1400, amountCents: 21400 }),
    row({ id: "b3", type: "EXPENSE", taxRate: 19, netCents: 5000, taxCents: 950, amountCents: 5950 }),
    row({ id: "b4", taxRate: 0, netCents: 3000, taxCents: 0, amountCents: 3000 }),
  ]);
  assert.equal(result.kz81BaseEuros, 100);
  assert.equal(result.kz81TaxCents, 1900);
  assert.equal(result.kz86BaseEuros, 200);
  assert.equal(result.kz86TaxCents, 1400);
  assert.equal(result.kz66Cents, 950);
  assert.equal(result.kz83Cents, 1900 + 1400 - 950);
  assert.equal(result.rows["81"].length + result.rows["86"].length + result.rows["66"].length, 3);
});

test("UStVA dönemleri", () => {
  assert.equal(vatPeriods(2026, "MONTH").length, 12);
  const q = vatPeriods(2026, "QUARTER");
  assert.equal(q[0].to.toISOString().slice(0, 10), "2026-03-31");
  assert.equal(q[3].from.toISOString().slice(0, 10), "2026-10-01");
  assert.equal(vatPeriods(2024, "MONTH")[1].to.toISOString().slice(0, 10), "2024-02-29");
});

test("EÜR: net toplamlar + USt/VSt, sonuç brüt farkı", () => {
  const result = computeEuer([row({}), row({ id: "e", type: "EXPENSE", categoryId: "c2", categoryName: "Bürobedarf", categoryNumber: "4930", amountCents: 5950, netCents: 5000, taxCents: 950 }), row({ id: "t", type: "TRANSFER" })]);
  assert.equal(result.incomeNetCents, 10000);
  assert.equal(result.outputTaxCents, 1900);
  assert.equal(result.expenseNetCents, 5000);
  assert.equal(result.inputTaxCents, 950);
  assert.equal(result.resultCents, 11900 - 5950);
});

test("§ 19 sınırları", () => {
  assert.equal(checkSmallBusiness(20_000_00, 20_000_00).status, "ok");
  assert.equal(checkSmallBusiness(20_000_00, 30_000_00).status, "nextYear");
  assert.equal(checkSmallBusiness(26_000_00, 0).status, "lost");
  assert.equal(checkSmallBusiness(0, 100_000_01).status, "lost");
});
