import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { LayoutGrid } from "lucide-react";

import { allModules } from "../src/registry";
import {
  MODULE_HOME_KEY,
  findActiveKey,
  findActiveModule,
  moduleMenuItems,
} from "../src/shared/navigation/module-nav";
import { definePermissions } from "../src/shared/permissions/define";
import type { ModuleConfig } from "../src/shared/types/module";

const APP_DIR = path.join(process.cwd(), "src", "app");

/** src/app altındaki tüm sayfa (page.tsx) ve API (route.ts) yolları; rota grupları "(x)" atlanır. */
function collectRoutes(dir: string, segments: string[] = []): { pages: string[][]; apis: string[][] } {
  const result = { pages: [] as string[][], apis: [] as string[][] };
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const isGroup = /^\(.*\)$/.test(entry.name);
      const nested = collectRoutes(path.join(dir, entry.name), isGroup ? segments : [...segments, entry.name]);
      result.pages.push(...nested.pages);
      result.apis.push(...nested.apis);
    } else if (entry.name === "page.tsx") {
      result.pages.push(segments);
    } else if (entry.name === "route.ts") {
      result.apis.push(segments);
    }
  }
  return result;
}

function routeExists(routes: string[][], href: string): boolean {
  const wanted = href.split("?")[0].split("/").filter(Boolean);
  return routes.some(
    (route) =>
      route.length === wanted.length &&
      route.every((segment, index) => /^\[.+\]$/.test(segment) || segment === wanted[index]),
  );
}

function loadMessages(locale: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"));
}

function lookup(messages: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>(
    (current, part) => (current && typeof current === "object" ? (current as Record<string, unknown>)[part] : undefined),
    messages,
  );
}

describe("Sol panel menüsü", () => {
  const routes = collectRoutes(APP_DIR);

  test("her nav ve menü bağlantısının bir sayfası (veya indirme için API rotası) vardır", () => {
    const broken: string[] = [];
    for (const mod of allModules) {
      for (const item of mod.nav) {
        if (!routeExists(routes.pages, item.href)) broken.push(`${mod.key} nav → ${item.href}`);
      }
      for (const item of mod.menu ?? []) {
        const exists = item.isDownload ? routeExists(routes.apis, item.href) : routeExists(routes.pages, item.href);
        if (!exists) broken.push(`${mod.key} menu.${item.key} → ${item.href}`);
      }
    }
    assert.deepEqual(broken, [], `Sayfası olmayan menü bağlantıları:\n${broken.join("\n")}`);
  });

  test("menü öğesi anahtarları modül içinde benzersizdir ve ana sayfayı tekrar etmez", () => {
    for (const mod of allModules) {
      const keys = (mod.menu ?? []).map((item) => item.key);
      assert.equal(new Set(keys).size, keys.length, `${mod.key} menüsünde tekrarlanan anahtar var`);
      assert.ok(!keys.includes(MODULE_HOME_KEY), `${mod.key}: "${MODULE_HOME_KEY}" anahtarı ayrılmıştır`);
    }
  });

  test("her menü etiketi tr ve de çevirisinde <modül>.menu.<key> olarak bulunur", () => {
    const missing: string[] = [];
    for (const locale of ["tr", "de"]) {
      const messages = loadMessages(locale);
      for (const key of ["sidebar.overview", "sidebar.backToMain", "sidebar.backToModule"]) {
        if (typeof lookup(messages, key) !== "string") missing.push(`[${locale}] ${key}`);
      }
      for (const mod of allModules) {
        for (const item of mod.menu ?? []) {
          const key = `${mod.key}.menu.${item.key}`;
          if (typeof lookup(messages, key) !== "string") missing.push(`[${locale}] ${key}`);
        }
      }
    }
    assert.deepEqual(missing, [], `Eksik çeviriler:\n${missing.join("\n")}`);
  });
});

describe("Menü eşleştirme mantığı", () => {
  const permissions = definePermissions("demo", {
    ADMIN: ["view"],
    BOARD: ["view"],
    SECRETARY: ["view"],
    TREASURER: ["view"],
    AUDITOR: ["view"],
    TEACHER: ["view"],
    VIEWER: ["view"],
  });
  const permission = { definition: permissions, action: "view" as const };
  const mod = (key: string, href: string, menu?: ModuleConfig["menu"], group: "main" | "settings" = "main") =>
    ({
      key,
      label: key,
      category: "EXTENSION",
      nav: [{ href, label: key, icon: LayoutGrid, group, order: 1, permission }],
      menu,
    }) satisfies ModuleConfig;

  const events = mod("events", "/events", [
    { key: "upcoming", label: "Yaklaşan", href: "/events?filter.timeFilter=upcoming", icon: LayoutGrid },
    { key: "export", label: "Excel", href: "/api/events/export", icon: LayoutGrid, isDownload: true },
  ]);
  const mail = mod("mail", "/mail", [
    { key: "settings", label: "Ayarlar", href: "/mail", icon: LayoutGrid },
    { key: "logs", label: "Kayıtlar", href: "/mail/kayitlar", icon: LayoutGrid },
  ]);
  const settings = mod("system", "/ayarlar", undefined, "settings");
  const organization = mod("organization", "/ayarlar/dernek", undefined, "settings");
  const all = [events, mail, settings, organization];

  test("ana sayfa menüde yoksa 'Genel bakış' başa eklenir; varsa tekrar eklenmez", () => {
    assert.deepEqual(moduleMenuItems(events).map((item) => item.key), [MODULE_HOME_KEY, "upcoming", "export"]);
    assert.deepEqual(moduleMenuItems(mail).map((item) => item.key), ["settings", "logs"]);
    assert.deepEqual(moduleMenuItems(settings), []);
  });

  test("aktif modül en özgül eşleşmedir (alt sayfalar dahil)", () => {
    assert.equal(findActiveModule(all, "/events")?.key, "events");
    assert.equal(findActiveModule(all, "/events/abc")?.key, "events");
    assert.equal(findActiveModule(all, "/mail/kayitlar")?.key, "mail");
    assert.equal(findActiveModule(all, "/ayarlar/dernek")?.key, "organization");
    assert.equal(findActiveModule(all, "/ayarlar")?.key, "system");
    assert.equal(findActiveModule(all, "/eventsx"), undefined);
    assert.equal(findActiveModule(all, "/"), undefined);
  });

  test("sorgu parametreli bağlantı yalnızca parametre eşleşince aktif olur; indirme hiç aktif olmaz", () => {
    const items = moduleMenuItems(events);
    const key = (item: { key: string }) => item.key;
    assert.equal(findActiveKey(items, key, "/events"), MODULE_HOME_KEY);
    assert.equal(
      findActiveKey(items, key, "/events", new URLSearchParams("filter.timeFilter=upcoming")),
      "upcoming",
    );
    assert.equal(findActiveKey(items, key, "/events", new URLSearchParams("filter.timeFilter=past")), MODULE_HOME_KEY);
    assert.equal(findActiveKey(items, key, "/api/events/export"), undefined);
    assert.equal(findActiveKey(moduleMenuItems(mail), key, "/mail/kayitlar"), "logs");
    assert.equal(findActiveKey(moduleMenuItems(mail), key, "/mail"), "settings");
  });
});
