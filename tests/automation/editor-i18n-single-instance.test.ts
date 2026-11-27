import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";

import i18next from "i18next";

import { applyEditorLocale } from "@/modules/automation/editor/sdk-i18n";

/**
 * #602: @workflowbuilder/sdk kendi bağımlılığı olarak i18next ^24 bildirir. sdk-i18n.ts düzenleyici çevirilerini
 * varsayılan i18next örneğine ekler; SDK ile uygulama farklı kopyaları çözerse düzenleyici İngilizceye düşer.
 * pnpm override ile tek (yamalı) kopya kullanılır; bu test iki kopyaya geri dönüşü yakalar.
 */
describe("workflow editor i18next (#602)", () => {
  const root = process.cwd();

  it("the SDK and the app resolve the very same i18next module", () => {
    const fromApp = createRequire(path.join(root, "package.json")).resolve("i18next");
    const sdkDir = fs.realpathSync(path.join(root, "node_modules", "@workflowbuilder", "sdk"));
    const fromSdk = createRequire(path.join(sdkDir, "package.json")).resolve("i18next");
    assert.equal(fs.realpathSync(fromSdk), fs.realpathSync(fromApp));
  });

  it("the lockfile pins a single, patched i18next version", () => {
    const lock = fs.readFileSync(path.join(root, "pnpm-lock.yaml"), "utf8");
    const versions = new Set([...lock.matchAll(/^ {2}i18next@(\d+\.\d+\.\d+)/gm)].map((m) => m[1]));
    assert.deepEqual([...versions], ["26.3.4"]);
  });

  it("editor strings registered by the app are served by the shared instance", async () => {
    // Same options the SDK uses in its own init (resources, fallbackLng, load: languageOnly).
    await i18next.init({ resources: { en: { translation: { hello: "Hello" } } }, fallbackLng: "en", load: "languageOnly", interpolation: { escapeValue: false } });
    applyEditorLocale("de", { hello: "Hallo" });
    await i18next.changeLanguage("de");
    assert.equal(i18next.t("hello"), "Hallo");
    applyEditorLocale("tr", { hello: "Merhaba" });
    assert.equal(i18next.language, "tr");
    assert.equal(i18next.t("hello"), "Merhaba");
  });
});
