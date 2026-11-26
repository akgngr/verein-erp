import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  DEFAULT_MODULE_SETTINGS_GROUP,
  DEFAULT_SETTINGS_PAGE_GROUP,
  SETTINGS_GROUPS,
  compareSettingsEntries,
  groupSettingsEntries,
  resolveSettingsGroup,
  settingsPageOrder,
} from "@/shared/navigation/settings-groups";

/** #611: Ayar merkezi grupları registry'den kurulur; sıra deterministik, eski modüller varsayılana düşer. */
describe("settings groups (#611)", () => {
  it("has the nine owner-approved groups in a fixed order", () => {
    assert.deepEqual([...SETTINGS_GROUPS], [
      "general",
      "users-access",
      "security-privacy",
      "integrations",
      "appearance",
      "communication",
      "ai-automation",
      "module-management",
      "system-management",
    ]);
  });

  it("falls back for older modules and unknown values instead of dropping the page", () => {
    assert.equal(settingsPageOrder({ href: "/x", order: 7 }).group, DEFAULT_SETTINGS_PAGE_GROUP);
    assert.equal(settingsPageOrder({ href: "/x", order: 7 }).order, 7);
    assert.equal(resolveSettingsGroup("typo", DEFAULT_MODULE_SETTINGS_GROUP), "module-management");
    assert.equal(resolveSettingsGroup(undefined, "general"), "general");
    assert.equal(resolveSettingsGroup("integrations", "general"), "integrations");
  });

  it("orders by group, then order, then href, independent of input order", () => {
    const entries = [
      { group: "communication" as const, order: 10, href: "/mail" },
      { group: "general" as const, order: 20, href: "/b" },
      { group: "general" as const, order: 20, href: "/a" },
      { group: "general" as const, order: 10, href: "/z" },
      { group: "system-management" as const, order: 1, href: "/demo" },
    ];
    const expected = ["/z", "/a", "/b", "/mail", "/demo"];
    assert.deepEqual([...entries].sort(compareSettingsEntries).map((e) => e.href), expected);
    assert.deepEqual([...entries].reverse().sort(compareSettingsEntries).map((e) => e.href), expected);
  });

  it("groups entries and skips empty groups", () => {
    const sections = groupSettingsEntries([
      { group: "appearance", order: 1, href: "/w" },
      { group: "general", order: 1, href: "/g" },
    ]);
    assert.deepEqual(sections.map((s) => s.group), ["general", "appearance"]);
  });
});

/** Her ayar sayfası geçerli bir grup bildirir; her grubun TR/DE başlığı ve açıklaması vardır. */
describe("settings group declarations and translations (#611)", () => {
  const modulesDir = path.join(process.cwd(), "src", "modules");

  it("every nav item with group \"settings\" declares a known settingsGroup and settingsOrder", () => {
    const missing: string[] = [];
    let checked = 0;
    for (const mod of fs.readdirSync(modulesDir)) {
      const file = path.join(modulesDir, mod, "module.config.ts");
      if (!fs.existsSync(file)) continue;
      const source = fs.readFileSync(file, "utf8");
      // Nav öğesi: önceki `href:` ile sonraki `href:` arası (iç içe `permission: {…}` nesnesi de dahil).
      for (const match of source.matchAll(/group:\s*"settings"/g)) {
        const start = source.lastIndexOf("href:", match.index);
        const next = source.indexOf("href:", match.index);
        const block = source.slice(start, next === -1 ? undefined : next);
        checked += 1;
        if (block.includes('href: "/ayarlar"')) continue; // Ayar merkezinin kendisi listelenmez.
        const group = /settingsGroup:\s*"([^"]+)"/.exec(block)?.[1];
        const href = /href:\s*"([^"]+)"/.exec(block)?.[1] ?? "?";
        if (!group || !(SETTINGS_GROUPS as readonly string[]).includes(group) || !/settingsOrder:\s*\d+/.test(block)) {
          missing.push(`${mod}:${href}`);
        }
      }
    }
    assert.ok(checked >= 20, `expected the settings pages to be found, got ${checked}`);
    assert.deepEqual(missing, []);
  });

  it("has TR and DE title and description for every group", () => {
    for (const locale of ["tr", "de"]) {
      const shell = JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", "shell", `${locale}.json`), "utf8"));
      for (const group of SETTINGS_GROUPS) {
        const entry = shell.settings?.groups?.[group];
        assert.ok(entry?.title && entry?.description, `${locale}: settings.groups.${group}`);
      }
    }
  });

  it("the hub builds its sections from the registry, not from hard-coded sections", () => {
    const view = fs.readFileSync(path.join(modulesDir, "system", "views", "settings-overview-view.tsx"), "utf8");
    assert.match(view, /groupSettingsEntries\(/);
    assert.doesNotMatch(view, /sections\.(general|modules)\./);
    const sidebar = fs.readFileSync(path.join(process.cwd(), "src", "app", "(dashboard)", "_components", "sidebar.tsx"), "utf8");
    assert.match(sidebar, /compareSettingsEntries\(settingsPageOrder\(a\), settingsPageOrder\(b\)\)/);
  });
});
