import assert from "node:assert/strict";
import { test } from "node:test";

import { effectiveTaxRate, grossFromNet, splitGross, taxColumnsFromGross, DEFAULT_TAX_SETTINGS } from "../src/modules/accounting/services/tax";
import { SKR_SUGGESTIONS } from "../src/modules/accounting/services/skr";
import { bookingCreateSchema } from "../src/modules/accounting/schemas/booking";
import { accountNumberSchema } from "../src/modules/accounting/schemas/chart";

test("splitGross: brüt = net + KDV, kuruş kayması yok", () => {
  assert.deepEqual(splitGross(11900, 19), { netCents: 10000, taxCents: 1900 });
  assert.deepEqual(splitGross(10700, 7), { netCents: 10000, taxCents: 700 });
  assert.deepEqual(splitGross(5000, 0), { netCents: 5000, taxCents: 0 });
  for (const gross of [1, 99, 1234, 99999, 100001]) {
    for (const rate of [7, 19]) {
      const { netCents, taxCents } = splitGross(gross, rate);
      assert.equal(netCents + taxCents, gross);
      assert.ok(Number.isInteger(netCents) && Number.isInteger(taxCents));
    }
  }
});

test("grossFromNet ile splitGross tutarlı", () => {
  assert.deepEqual(grossFromNet(10000, 19), { grossCents: 11900, taxCents: 1900 });
  assert.equal(splitGross(grossFromNet(4321, 7).grossCents, 7).netCents, 4321);
});

test("§ 19 Kleinunternehmer: oran her zaman 0", () => {
  assert.equal(effectiveTaxRate(19, DEFAULT_TAX_SETTINGS), 19);
  assert.equal(effectiveTaxRate(19, { ...DEFAULT_TAX_SETTINGS, smallBusiness: true }), 0);
});

test("taxColumnsFromGross Decimal string üretir", () => {
  assert.deepEqual(taxColumnsFromGross(11900, 19), { taxRate: 19, netAmount: "100.00", taxAmount: "19.00" });
});

test("fiş şeması: geçersiz KDV oranı reddedilir, boş → 0", () => {
  const base = { type: "INCOME", bookingDate: "2026-10-01", accountId: "a", categoryId: "c", amount: "10,00", description: "Test", counterparty: null, receiptReference: null, projectId: null };
  assert.equal(bookingCreateSchema.safeParse({ ...base, taxRate: "16" }).success, false);
  const parsed = bookingCreateSchema.safeParse(base);
  assert.ok(parsed.success);
  assert.equal((parsed.data as { taxRate?: number }).taxRate, 0);
});

test("hesap numarası: 4–8 hane, boş → null", () => {
  assert.equal(accountNumberSchema.parse(""), null);
  assert.equal(accountNumberSchema.parse("8400"), "8400");
  assert.equal(accountNumberSchema.safeParse("84a").success, false);
});

test("SKR önerileri: her iki planda aynı anahtarlar", () => {
  for (const group of ["income", "expense", "money"] as const) {
    assert.deepEqual(SKR_SUGGESTIONS.SKR03[group].map((s) => s.key), SKR_SUGGESTIONS.SKR04[group].map((s) => s.key));
  }
});
