import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { allModules } from "../src/registry";

describe("Module Registry Integrity", () => {
  test("all registered modules have valid metadata and categories", () => {
    assert.ok(allModules.length >= 9, "En az 9 modül kayıtlı olmalıdır");

    const validCategories = ["CORE", "OFFICIAL", "EXTENSION"];
    const keys = new Set<string>();

    for (const mod of allModules) {
      assert.ok(mod.key, "Modül anahtarı boş olamaz");
      assert.ok(!keys.has(mod.key), `Tekrarlanan modül anahtarı: ${mod.key}`);
      keys.add(mod.key);

      assert.ok(mod.label, `${mod.key} modülünün etiketi (label) bulunmalıdır`);
      assert.ok(
        validCategories.includes(mod.category),
        `${mod.key} modülünün kategorisi geçerli olmalıdır (${validCategories.join(", ")})`,
      );

      // Nav kontrolü
      if (mod.nav && mod.nav.length > 0) {
        for (const item of mod.nav) {
          assert.ok(item.href.startsWith("/"), `${item.href} rotası '/' ile başlamalıdır`);
          assert.ok(item.label, "Menü öğesinin etiketi bulunmalıdır");
          assert.ok(item.permission, "Menü öğesinin yetki tanımı bulunmalıdır");
        }
      }

      // Modül menüsü (sol panel) kontrolü; bağlantı hedefleri tests/navigation.test.ts'te
      for (const item of mod.menu ?? []) {
        assert.ok(item.key, `${mod.key} menü öğesinin anahtarı (key) bulunmalıdır`);
        assert.ok(item.label, `${mod.key} menü öğesinin etiketi (label) bulunmalıdır`);
        assert.ok(item.href.startsWith("/"), `${mod.key} menü öğesi rotası '/' ile başlamalıdır`);
      }
    }
  });

  test("core modules are marked protected or CORE category", () => {
    const coreKeys = ["auth", "system", "audit", "organization", "users", "mail"];
    for (const key of coreKeys) {
      const mod = allModules.find((m) => m.key === key);
      assert.ok(mod, `${key} çekirdek modülü registry'de bulunmalıdır`);
      assert.strictEqual(mod.category, "CORE", `${key} modülü CORE kategorisinde olmalıdır`);
    }
  });

  test("module menus configure expected module actions", () => {
    const accounting = allModules.find((m) => m.key === "accounting");
    assert.ok(accounting?.menu, "accounting modülü menu tanımlamalıdır");
    const accountingKeys = accounting.menu.map((t) => t.key);
    assert.ok(accountingKeys.includes("sync"), "Üyelik aktarımı menüde olmalıdır");
    assert.ok(accountingKeys.includes("reports"), "Raporlar menüde olmalıdır");
    assert.ok(accountingKeys.includes("budget"), "Bütçe menüde olmalıdır");
    assert.ok(accountingKeys.includes("yearClosing"), "Yıl kapanışı menüde olmalıdır");
    assert.ok(accountingKeys.includes("settings"), "Ayarlar menüde olmalıdır");
    assert.ok(accountingKeys.includes("export"), "Excel'e aktar menüde olmalıdır");

    const members = allModules.find((m) => m.key === "members");
    assert.ok(members?.menu, "members modülü menu tanımlamalıdır");
    const membersKeys = members.menu.map((t) => t.key);
    assert.ok(membersKeys.includes("dues"), "Aidat raporu menüde olmalıdır");
    assert.ok(membersKeys.includes("types"), "Üyelik türleri menüde olmalıdır");
  });
});
