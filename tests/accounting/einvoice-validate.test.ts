import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { XInvoiceData } from "@/modules/accounting/services/einvoice-out";
import { EINVOICE_RULES, validateIncoming, validateOutgoing } from "@/modules/accounting/services/einvoice-validate";

const party = { name: "Test Verein e.V.", street: "Hauptstr. 1", postalCode: "10115", city: "Berlin", countryCode: "DE", vatId: "DE123456789", taxNumber: null, email: "info@verein.de", phone: "030 123", contactName: null };
const good: XInvoiceData = {
  number: "R-2026-0001", issueDate: "2026-11-07", dueDate: "2026-11-21", serviceDate: null, buyerReference: "04011000-1234512345-06", currency: "EUR",
  seller: party, buyer: { ...party, name: "Kunde GmbH", vatId: null, email: null, phone: null },
  iban: "DE89370400440532013000", bic: null, paymentTerms: null, note: null, smallBusiness: false,
  lines: [{ position: 1, description: "Raummiete", quantity: 2, unit: "Std", unitPriceCents: 5000, netCents: 10000, taxRate: 19 }],
  byRate: [{ rate: 19, netCents: 10000, taxCents: 1900 }], netCents: 10000, taxCents: 1900, grossCents: 11900, paidCents: 0,
};
const rules = (data: XInvoiceData) => validateOutgoing(data).map((issue) => issue.rule);

test("geçerli fatura hata vermez", () => {
  assert.deepEqual(validateOutgoing(good), []);
});

test("BR-DE satıcı ve ödeme kuralları", () => {
  const found = rules({ ...good, iban: null, seller: { ...party, phone: null, email: null, city: null, postalCode: null, vatId: null, taxNumber: null } });
  for (const rule of ["BR-DE-1", "BR-DE-3", "BR-DE-4", "BR-DE-6", "BR-DE-7", "BR-DE-16", "BR-S-02"]) assert.ok(found.includes(rule), rule);
  assert.ok(rules({ ...good, buyerReference: null }).includes("BR-DE-15"));
  assert.equal(validateOutgoing({ ...good, buyerReference: null }).find((issue) => issue.rule === "BR-DE-15")?.severity, "warning");
});

test("toplam ve KDV tutarlılığı", () => {
  assert.ok(rules({ ...good, grossCents: 12000 }).includes("BR-CO-15"));
  assert.ok(rules({ ...good, netCents: 9000, grossCents: 10900 }).includes("BR-CO-10"));
  assert.ok(rules({ ...good, byRate: [{ rate: 19, netCents: 10000, taxCents: 1700 }], taxCents: 1700, grossCents: 11700 }).includes("BR-S-09"));
  assert.ok(rules({ ...good, smallBusiness: true }).includes("BR-E-09")); // § 19: KDV gösterilemez
  const kleinunternehmer = { ...good, smallBusiness: true, lines: [{ ...good.lines[0], taxRate: 0 }], byRate: [{ rate: 0, netCents: 10000, taxCents: 0 }], taxCents: 0, grossCents: 10000 };
  assert.deepEqual(rules(kleinunternehmer), []);
});

test("iptal faturası: ödeme bilgisi şart değil, referans uyarısı", () => {
  assert.deepEqual(rules({ ...good, typeCode: 381, iban: null, precedingInvoice: { number: "R-2026-0001", issueDate: "2026-10-01" } }), []);
  assert.ok(rules({ ...good, typeCode: 381, precedingInvoice: null }).includes("BR-55"));
});

test("gelen e-fatura tutarlılık kontrolü", () => {
  const parsed = { syntax: "UBL" as const, number: "1", issueDate: "2026-11-01", dueDate: null, serviceDate: null, sellerName: "X", sellerVatId: "DE1", sellerTaxNumber: null, sellerAddress: "a", sellerIban: null, currency: "EUR", netCents: 100, taxCents: 19, grossCents: 119, payableCents: 119, byRate: [{ rate: 19, netCents: 100, taxCents: 19 }], lineCount: 1 };
  assert.deepEqual(validateIncoming(parsed), []);
  assert.ok(validateIncoming({ ...parsed, grossCents: 200, payableCents: 200 }).map((issue) => issue.rule).includes("BR-CO-15"));
});

test("her kural kodunun tr/de açıklaması var", () => {
  for (const lang of ["tr", "de"]) {
    const messages = JSON.parse(readFileSync(`src/modules/accounting/messages/${lang}.json`, "utf8")).einvoice.rules as Record<string, string>;
    for (const rule of EINVOICE_RULES) assert.ok(messages[rule], `${lang} ${rule}`);
  }
});
