/**
 * Dokümantasyon sitesindeki modül kataloğu (website/docs/kullanim/moduller) kodla aynı olmalı.
 * Modülün açıklaması, sürümü, yetkileri, erişimleri ya da sürüm notu değişince: `pnpm docs:modules`.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { MODULE_DOCS_DIR, renderModuleDocs } from "../../scripts/docs/generate-module-docs";

test("dokümantasyon modül kataloğu güncel (pnpm docs:modules)", async () => {
  const expected = await renderModuleDocs();
  const actual = fs.existsSync(MODULE_DOCS_DIR) ? fs.readdirSync(MODULE_DOCS_DIR).sort() : [];
  assert.deepEqual(actual, [...expected.keys()].sort(), "Katalog dosyaları farklı: pnpm docs:modules çalıştırın");
  const stale = [...expected].filter(([name, content]) => fs.readFileSync(path.join(MODULE_DOCS_DIR, name), "utf8") !== content).map(([name]) => name);
  assert.deepEqual(stale, [], `Güncel olmayan katalog sayfaları (pnpm docs:modules): ${stale.join(", ")}`);
});
