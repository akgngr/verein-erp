import assert from "node:assert/strict";
import { test } from "node:test";

import { ACCOUNTING_PRESETS } from "../src/modules/accounting/services/setup-preset";
import { SKR_SUGGESTIONS } from "../src/modules/accounting/services/skr";
import { MODULE_PRESETS, ORGANIZATION_TYPES, PRESET_MANAGED_MODULES } from "../src/modules/system/services/setup";

test("her kurum türünün modül ve muhasebe hazır ayarı var", () => {
  for (const type of ORGANIZATION_TYPES) {
    assert.ok(MODULE_PRESETS[type].length, type);
    assert.ok(ACCOUNTING_PRESETS[type].categories.length, type);
    for (const key of MODULE_PRESETS[type]) assert.ok(PRESET_MANAGED_MODULES.includes(key), `${type}: ${key}`);
  }
  assert.ok(MODULE_PRESETS.NACHHILFE.includes("students") && MODULE_PRESETS.NACHHILFE.includes("courses"));
  assert.ok(MODULE_PRESETS.VEREIN.includes("members") && !MODULE_PRESETS.VEREIN.includes("students"));
  assert.ok(ACCOUNTING_PRESETS.KLEINGEWERBE.smallBusiness && !ACCOUNTING_PRESETS.MITTELSTAND.smallBusiness);
  assert.equal(ACCOUNTING_PRESETS.MITTELSTAND.chart, "SKR04");
});

test("SKR anahtarları iki hesap planında da çözülüyor; kategori adları tekil", () => {
  for (const type of ORGANIZATION_TYPES) {
    const names = ACCOUNTING_PRESETS[type].categories.map((category) => category.name);
    assert.equal(new Set(names).size, names.length, type);
    for (const category of ACCOUNTING_PRESETS[type].categories) {
      const skr = (category as { skr?: string }).skr;
      if (!skr) continue;
      for (const chart of ["SKR03", "SKR04"] as const) {
        const all = [...SKR_SUGGESTIONS[chart].income, ...SKR_SUGGESTIONS[chart].expense];
        assert.ok(all.some((item) => item.key === skr), `${type}/${category.name}: ${skr} (${chart})`);
      }
    }
  }
});
