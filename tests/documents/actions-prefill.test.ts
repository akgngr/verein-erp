import assert from "node:assert/strict";
import { test } from "node:test";

import { payablePrefillSchema } from "@/modules/accounting/services/payable-import";
import { taskPrefillFromParams } from "@/modules/tasks/lib/prefill";

test("gelen fatura ön doldurma: geçerli alanlar kabul, bilinmeyen alan ve bozuk tarih reddedilir", () => {
  assert.ok(payablePrefillSchema.safeParse({ supplierName: "Stadtwerke Köln GmbH", number: "RE-2026-4711", issueDate: "2026-11-02", dueDate: "2026-11-30", iban: "DE89370400440532013000", notes: "x" }).success);
  assert.equal(payablePrefillSchema.safeParse({ grossCents: 100 }).success, false);
  assert.equal(payablePrefillSchema.safeParse({ dueDate: "30.11.2026" }).success, false);
  assert.equal(payablePrefillSchema.safeParse({ iban: "kein iban" }).success, false);
});

test("görev ön doldurma: yalnız beklenen parametreler, sınırlar ve tarih biçimi", () => {
  assert.deepEqual(taskPrefillFromParams({ baslik: "  Evrak: Fatura ", aciklama: "GLN-2026-0001", bitis: "2026-11-30", yeni: "1" }), { title: "Evrak: Fatura", description: "GLN-2026-0001", dueDate: "2026-11-30" });
  assert.deepEqual(taskPrefillFromParams({ bitis: "30.11.2026", baslik: ["a", "b"] }), { title: undefined, description: undefined, dueDate: undefined });
  assert.equal(taskPrefillFromParams({ baslik: "x".repeat(500) }).title?.length, 200);
});
