import assert from "node:assert/strict";
import { test } from "node:test";

import { invoiceRequirement, isLeitwegId, issuerObligation, missingLeitweg, readinessChecks } from "@/modules/accounting/services/einvoice-obligation";
import { parseEuroToCents } from "@/modules/accounting/schemas/settings";

const auto = { mode: "AUTO" as const, smallBusiness: false, previousYearRevenueCents: null };

test("EI-4 kesme zorunluluğu: 2026 geçiş, 2027 ciro eşiği, 2028 herkes", () => {
  assert.deepEqual(issuerObligation({ ...auto, year: 2026 }), { required: false, reason: "transition" });
  assert.deepEqual(issuerObligation({ ...auto, year: 2027 }), { required: false, reason: "unknownRevenue2027" });
  assert.equal(issuerObligation({ ...auto, previousYearRevenueCents: 80_000_001, year: 2027 }).required, true);
  assert.equal(issuerObligation({ ...auto, previousYearRevenueCents: 80_000_000, year: 2027 }).required, false);
  assert.equal(issuerObligation({ ...auto, year: 2028 }).required, true);
  assert.equal(issuerObligation({ ...auto, smallBusiness: true, year: 2030 }).reason, "smallBusiness");
  assert.equal(issuerObligation({ ...auto, mode: "ALWAYS", year: 2025 }).required, true);
  assert.equal(issuerObligation({ ...auto, mode: "NEVER", year: 2030 }).required, false);
});

test("EI-4 fatura gerekliliği: kamu, B2C, küçük tutar, B2B", () => {
  const required = { required: true, reason: "from2028" } as const;
  const voluntary = { required: false, reason: "transition" } as const;
  assert.equal(invoiceRequirement({ recipientType: "PUBLIC", grossCents: 1000, issuer: voluntary }).level, "required");
  assert.equal(invoiceRequirement({ recipientType: "B2C", grossCents: 1_000_000, issuer: required }).reason, "b2c");
  assert.equal(invoiceRequirement({ recipientType: "B2B", grossCents: 25_000, issuer: required }).reason, "small");
  assert.equal(invoiceRequirement({ recipientType: "B2B", grossCents: 25_001, issuer: required }).level, "required");
  assert.equal(invoiceRequirement({ recipientType: "B2B", grossCents: 25_001, issuer: voluntary }).level, "recommended");
});

test("EI-4 Leitweg-ID biçimi ve kamu alıcısında zorunluluk", () => {
  assert.ok(isLeitwegId("04011000-1234512345-06"));
  assert.ok(isLeitwegId("991-33333TEST-33"));
  assert.ok(!isLeitwegId("abc"));
  assert.equal(missingLeitweg({ recipientType: "PUBLIC", buyerReference: null, contactLeitwegId: null }), true);
  assert.equal(missingLeitweg({ recipientType: "PUBLIC", buyerReference: null, contactLeitwegId: "04011000-1234512345-06" }), false);
  assert.equal(missingLeitweg({ recipientType: "B2B", buyerReference: null, contactLeitwegId: null }), false);
});

test("EI-4 hazırlık listesi ve ciro girişi", () => {
  const checks = readinessChecks({ name: "V", street: "S", postalCode: "1", city: "B", vatId: null, taxNumber: "12/3", email: "e", phone: null, iban: null });
  assert.deepEqual(checks.filter((check) => !check.ok).map((check) => check.key), ["sellerContact", "iban"]);
  assert.equal(parseEuroToCents("850.000"), 85_000_000);
  assert.equal(parseEuroToCents("850.000,50"), 85_000_050);
  assert.equal(parseEuroToCents("1234.5"), 123_450);
  assert.equal(parseEuroToCents("abc"), null);
});
