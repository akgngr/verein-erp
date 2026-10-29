import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isLocale, toLocale, DEFAULT_LOCALE, SUPPORTED_LOCALES } from "../src/i18n/config";
import { syncModuleTranslations } from "../src/shared/modules/sync-i18n";

describe("i18n Multilang Configuration & Parity", () => {
  test("locale validator and fallback work correctly", () => {
    assert.deepStrictEqual(SUPPORTED_LOCALES, ["tr", "de"]);
    assert.strictEqual(isLocale("tr"), true);
    assert.strictEqual(isLocale("de"), true);
    assert.strictEqual(isLocale("en"), false);
    assert.strictEqual(isLocale(null), false);
    assert.strictEqual(isLocale(undefined), false);

    assert.strictEqual(toLocale("tr"), "tr");
    assert.strictEqual(toLocale("de"), "de");
    assert.strictEqual(toLocale("xyz"), DEFAULT_LOCALE);
    assert.strictEqual(toLocale(null), DEFAULT_LOCALE);
  });

  test("syncModuleTranslations builds root message files from shell + modules", () => {
    const res = syncModuleTranslations();
    assert.ok(res.locales.includes("tr"));
    assert.ok(res.locales.includes("de"));

    const trPath = path.join(process.cwd(), "messages", "tr.json");
    const dePath = path.join(process.cwd(), "messages", "de.json");
    assert.ok(fs.existsSync(trPath), "messages/tr.json mevcut olmalıdır");
    assert.ok(fs.existsSync(dePath), "messages/de.json mevcut olmalıdır");

    const tr = JSON.parse(fs.readFileSync(trPath, "utf8"));
    const de = JSON.parse(fs.readFileSync(dePath, "utf8"));

    // settings ve system anahtarları hem TR hem DE'de bulunmalıdır
    assert.ok(tr.settings, "tr.json settings anahtarını içermelidir");
    assert.ok(de.settings, "de.json settings anahtarını içermelidir");
    assert.ok(tr.system, "tr.json system anahtarını içermelidir");
    assert.ok(de.system, "de.json system anahtarını içermelidir");

    // Dil adları ve temel başlıklar
    assert.strictEqual(tr.settings.title, "Ayarlar");
    assert.strictEqual(de.settings.title, "Einstellungen");
    assert.strictEqual(tr.system.title, "Modül Yönetimi");
    assert.strictEqual(de.system.title, "Modulverwaltung");
  });

  test("modülden silinen anahtar kökte kalmaz; modül nav'ı kök nav'a eklenir", () => {
    const moduleDir = path.join(process.cwd(), "src", "modules", "temp-i18n-mod");
    const write = (messages: Record<string, unknown>) => {
      fs.mkdirSync(path.join(moduleDir, "messages"), { recursive: true });
      for (const locale of SUPPORTED_LOCALES) {
        fs.writeFileSync(path.join(moduleDir, "messages", `${locale}.json`), JSON.stringify(messages));
      }
    };
    const read = () => JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", "tr.json"), "utf8"));

    try {
      write({ nav: { tempI18n: "Geçici" }, title: "T", old: "silinecek" });
      syncModuleTranslations();
      assert.equal(read()["temp-i18n-mod"].old, "silinecek");
      assert.equal(read().nav.tempI18n, "Geçici");

      write({ title: "T" });
      syncModuleTranslations();
      assert.deepEqual(read()["temp-i18n-mod"], { title: "T" }, "eski anahtar kalmamalıdır");
      assert.equal(read().nav.tempI18n, undefined, "eski nav etiketi kalmamalıdır");
    } finally {
      fs.rmSync(moduleDir, { recursive: true, force: true });
      syncModuleTranslations();
    }
    assert.equal(read()["temp-i18n-mod"], undefined, "silinen modülün ad alanı kalmamalıdır");
  });
});
