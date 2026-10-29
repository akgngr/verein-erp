import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { moduleFiles, scaffoldNames } from "../scripts/scaffold-templates";
import { scanSource } from "../scripts/check-hardcoded-text";

/**
 * `pnpm module:create` şablonları kuralları baştan sağlamalı: aksi hâlde her yeni
 * modül (insan ya da AI yazsın) aynı hatalarla başlar. Tam derleme/tarayıcı denemesi
 * elle yapılır (README: Modül geliştirme); burada hızlı yapısal denetimler var.
 */
const names = scaffoldNames("demo-items", { labelTr: "Demo Kayıtlar", labelDe: "Demo-Einträge" });
const files = moduleFiles(names);

function leafKeys(node: unknown, prefix = ""): string[] {
  if (typeof node !== "object" || node === null) return [prefix];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    leafKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("module scaffold templates", () => {
  test("generates the standard module layout", () => {
    for (const required of [
      "module.config.ts",
      "permissions.ts",
      "schema.prisma",
      "index.ts",
      "server.ts",
      "ui.ts",
      "page.tsx",
      "messages/tr.json",
      "messages/de.json",
      "views/item-list-view.tsx",
      "components/item-form.tsx",
      "actions/item-actions.ts",
    ]) {
      assert.ok(files[required], `missing ${required}`);
    }
  });

  test("server files never import HeroUI; client files start with the directive", () => {
    for (const [file, source] of Object.entries(files)) {
      if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
      const usesHeroUi = /from "@heroui\/react"/.test(source);
      const isClient = source.startsWith('"use client";');
      if (usesHeroUi) assert.ok(isClient, `${file} imports HeroUI without "use client"`);
      if (source.includes('"use client"') || source.includes('"use server"')) {
        assert.match(source, /^"use (client|server)";/, `${file}: directive must be the first statement`);
      }
    }
  });

  test("has no hard-coded UI text", () => {
    const findings = Object.entries(files)
      .filter(([file]) => /\.(ts|tsx)$/.test(file) && file !== "module.config.ts")
      .flatMap(([file, source]) => scanSource(file, source));
    assert.deepEqual(findings, []);
  });

  test("tr/de messages have the same keys, nav/module labels and a real German label", () => {
    const tr = JSON.parse(files["messages/tr.json"]);
    const de = JSON.parse(files["messages/de.json"]);
    assert.deepEqual(leafKeys(de).sort(), leafKeys(tr).sort());
    assert.equal(tr.nav["demo-items"], "Demo Kayıtlar");
    assert.equal(de.nav["demo-items"], "Demo-Einträge");
    assert.equal(de.module.label, "Demo-Einträge");
  });

  test("every static translation key used in the templates exists", () => {
    const tr = JSON.parse(files["messages/tr.json"]);
    const keys = new Set(leafKeys(tr).map((key) => `${names.key}.${key}`));
    const used = new Set<string>();
    for (const source of Object.values(files)) {
      // getTranslations("ns") / useTranslations("ns") + t("key")
      const namespaces = [...source.matchAll(/(?:get|use)Translations\("([^"]+)"\)/g)].map((m) => m[1]);
      for (const call of source.matchAll(/\bt\("([\w.]+)"/g)) {
        if (namespaces.length) used.add(`${namespaces[0]}.${call[1]}`);
      }
      // zod / ActionError mesajları tam anahtardır (ad alanı dizgeleri hariç).
      for (const message of source.matchAll(/"(demo-items\.[\w.]+)"/g)) {
        if (!namespaces.includes(message[1])) used.add(message[1]);
      }
    }
    const missing = [...used].filter((key) => !keys.has(key));
    assert.deepEqual(missing, []);
  });
});
