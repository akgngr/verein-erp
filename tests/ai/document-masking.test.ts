import assert from "node:assert/strict";
import { test } from "node:test";

import { maskDocumentForCloud } from "@/modules/ai/services/document-masking";

const known = { names: ["Ayşe Yılmaz"], references: ["UYE-2026-0090"] };

test("evrak buluta gitmeden adlar, adres, IBAN, e-posta maskelenir; çıktıda geri çözülür", () => {
  const text = `Stadtwerke Köln GmbH
Frau Schneider, Lindenstraße 12, 50667 Köln
Kundin: Ayşe Yılmaz (UYE-2026-0090), ayse@example.org
Rechnung über 120,00 € — IBAN DE89 3704 0044 0532 0130 00`;
  const result = maskDocumentForCloud(text, known);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  for (const secret of ["Schneider", "Lindenstraße", "50667 Köln", "Ayşe", "UYE-2026", "ayse@", "DE89"]) assert.ok(!result.text.includes(secret), `${secret} sızdı: ${result.text}`);
  assert.match(result.text, /Stadtwerke Köln GmbH/);
  assert.match(result.text, /120,00 €/);
  const summary = result.text.match(/\[PERSON_\d+\]/)![0] + " için fatura; adres " + result.text.match(/\[DOC_ADDRESS_\d+\]/)![0];
  assert.match(result.restore(summary), /Ayşe Yılmaz için fatura; adres Lindenstraße 12/);
});

test("kişiyle birlikte özel nitelikli veri varsa buluta gönderilmez", () => {
  assert.deepEqual(maskDocumentForCloud("Ärztliches Attest für Ayşe Yılmaz: Diagnose Diabetes", known), { ok: false, reason: "specialCategory" });
  assert.deepEqual(maskDocumentForCloud("Herr Becker ist krank geschrieben", known), { ok: false, reason: "specialCategory" });
  assert.equal(maskDocumentForCloud("Einladung zum Gesundheitskurs der Stadt", known).ok, true);
});
