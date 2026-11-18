import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { moduleSecretaryRegistry } from "@/secretary-registry";
import { definePermissions } from "@/shared/permissions/define";
import {
  defineModuleSecretary,
  validateBriefingItem,
  validateModuleSecretary,
  type BriefingItem,
} from "@/shared/secretary/define";

const permission = { definition: definePermissions("demo", { ADMIN: ["view"], BOARD: [], SECRETARY: [], TREASURER: [], AUDITOR: [], TEACHER: [], VIEWER: [] }), action: "view" as const };
const item = (overrides: Partial<BriefingItem> = {}): BriefingItem => ({
  id: "accounting:invoice-overdue", module: "accounting", kind: "invoice-overdue", severity: "warning",
  title: "3 überfällige Rechnungen", href: "/muhasebe/faturalar", ...overrides,
});

test("defineModuleSecretary keeps the definition and validation accepts a correct one", async () => {
  const definition = defineModuleSecretary({ module: "accounting", providers: [{ key: "overdue", permission, collect: async () => [item()] }] });
  assert.deepEqual(validateModuleSecretary("accounting", definition), []);
  assert.deepEqual(validateBriefingItem("accounting", (await definition.providers[0].collect({ user: { id: "u", role: "ADMIN" }, now: new Date(), t: (k) => k }))[0]), []);
});

test("validateModuleSecretary rejects module mismatch, bad and duplicate provider keys", () => {
  const collect = async () => [];
  const errors = validateModuleSecretary("accounting", { module: "members", providers: [{ key: "a", permission, collect }, { key: "a", permission, collect }, { key: "Bad Key", permission, collect }] });
  assert.ok(errors.includes("module-mismatch:members"));
  assert.ok(errors.includes("provider-duplicate:a"));
  assert.ok(errors.includes("provider-key:Bad Key"));
});

test("validateBriefingItem enforces own-module ids, internal links, title and dates", () => {
  assert.deepEqual(validateBriefingItem("accounting", item({ id: "accounting:invoice-overdue:inv_123" })), []);
  assert.ok(validateBriefingItem("accounting", item({ id: "members:dues" }))[0].startsWith("item-id"));
  assert.ok(validateBriefingItem("accounting", item({ href: "https://evil.example" })).some((e) => e.startsWith("item-href")));
  assert.ok(validateBriefingItem("accounting", item({ href: "//evil.example" })).some((e) => e.startsWith("item-href")));
  assert.ok(validateBriefingItem("accounting", item({ title: " " })).some((e) => e.startsWith("item-title")));
  assert.ok(validateBriefingItem("accounting", item({ dueAt: "not-a-date" })).some((e) => e.startsWith("item-due")));
});

test("generated registry contains exactly the modules with secretary.ts, all valid", () => {
  const root = path.resolve("src/modules");
  const withFile = fs.readdirSync(root).filter((mod) => fs.existsSync(path.join(root, mod, "secretary.ts"))).sort();
  assert.deepEqual(moduleSecretaryRegistry.map((entry) => entry.module).sort(), withFile);
  for (const entry of moduleSecretaryRegistry) assert.deepEqual(validateModuleSecretary(entry.module, entry), [], entry.module);
});

test("secretary module does not import other modules (contributions come only via the registry)", () => {
  const root = path.resolve("src/modules/secretary");
  const files: string[] = [];
  const walk = (dir: string) => fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => (d.isDirectory() ? walk(path.join(dir, d.name)) : /\.tsx?$/.test(d.name) && files.push(path.join(dir, d.name))));
  walk(root);
  // users: günlük özet işinde kullanıcının etkinliği ve rolü (module.config access ile bildirilmiş).
  const allowed = new Set(["secretary", "auth", "system", "users"]);
  for (const file of files) {
    for (const match of fs.readFileSync(file, "utf8").matchAll(/from\s+["']@\/modules\/([a-z0-9-]+)/g)) {
      assert.ok(allowed.has(match[1]), `${path.relative(root, file)} imports @/modules/${match[1]}`);
    }
  }
});
