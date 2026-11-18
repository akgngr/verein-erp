import assert from "node:assert/strict";
import { test } from "node:test";

import { getBriefing, isHidden, sortItems } from "@/modules/secretary/services/briefing";
import { definePermissions } from "@/shared/permissions/define";
import { defineModuleSecretary, type BriefingItem, type ModuleSecretary } from "@/shared/secretary/define";

const roles = (admin: ("view")[], board: ("view")[] = []) => ({ ADMIN: admin, BOARD: board, SECRETARY: [], TREASURER: [], AUDITOR: [], TEACHER: [], VIEWER: [] });
const view = (grants = roles(["view"])) => ({ definition: definePermissions("demo", grants), action: "view" as const });
const item = (module: string, kind: string, severity: BriefingItem["severity"] = "info", extra: Partial<BriefingItem> = {}): BriefingItem =>
  ({ id: `${module}:${kind}`, module, kind, severity, title: kind, href: `/${module}`, ...extra });

const accounting = defineModuleSecretary({ module: "accounting", providers: [
  { key: "overdue", permission: view(), collect: async () => [item("accounting", "overdue", "danger"), item("accounting", "tax", "info", { dueAt: "2026-12-10" })] },
] });
const tasks = defineModuleSecretary({ module: "tasks", providers: [
  { key: "today", permission: view(roles(["view"], ["view"])), collect: async () => [item("tasks", "due-today", "warning")] },
] });
const now = new Date("2026-11-18T07:00:00Z");
const base = { usableModules: async () => ["accounting", "tasks"], translator: async () => (k: string) => k, itemStates: async () => [] };
const run = (role: string, registry: ModuleSecretary[], deps: object = {}) => getBriefing({ id: "u1", role }, now, { registry, ...base, ...deps });

test("collects from permitted providers, sorted by severity, sections ordered by most severe item", async () => {
  const briefing = await run("ADMIN", [tasks, accounting]);
  assert.deepEqual(briefing.sections.map((s) => s.module), ["accounting", "tasks"]);
  assert.deepEqual(briefing.sections[0].items.map((i) => i.kind), ["overdue", "tax"]);
  assert.deepEqual(briefing.failures, []);
});

test("providers without permission are not called", async () => {
  let called = false;
  const guarded = defineModuleSecretary({ module: "accounting", providers: [{ key: "x", permission: view(), collect: async () => { called = true; return []; } }] });
  const briefing = await run("BOARD", [guarded, tasks]);
  assert.equal(called, false);
  assert.deepEqual(briefing.sections.map((s) => s.module), ["tasks"]);
});

test("disabled or unapproved modules are skipped", async () => {
  const briefing = await run("ADMIN", [accounting, tasks], { usableModules: async () => ["tasks"] });
  assert.deepEqual(briefing.sections.map((s) => s.module), ["tasks"]);
});

test("failing, slow and invalid providers only end up in failures", async () => {
  const bad = defineModuleSecretary({ module: "members", providers: [
    { key: "boom", permission: view(), collect: async () => { throw new Error("secret detail"); } },
    { key: "slow", permission: view(), collect: () => new Promise((resolve) => setTimeout(() => resolve([item("members", "late")]), 200)) },
    { key: "invalid", permission: view(), collect: async () => [item("members", "ok"), { ...item("members", "x"), href: "https://evil.example" }] },
  ] });
  const briefing = await run("ADMIN", [bad, tasks], { usableModules: async () => ["members", "tasks"], timeoutMs: 50 });
  assert.deepEqual(briefing.failures, ["members.boom", "members.invalid", "members.slow"]);
  assert.deepEqual(briefing.sections.find((s) => s.module === "members")?.items.map((i) => i.kind), ["ok"]);
});

test("dismissed and active snoozed items are hidden; expired snooze shows again; limit 20", async () => {
  const many = defineModuleSecretary({ module: "tasks", providers: [{ key: "many", permission: view(), collect: async () => Array.from({ length: 25 }, (_, n) => item("tasks", `t${n}`)) }] });
  const briefing = await run("ADMIN", [many], { itemStates: async () => [
    { itemId: "tasks:t0", state: "DISMISSED", until: null },
    { itemId: "tasks:t1", state: "SNOOZED", until: new Date("2026-11-19T00:00:00Z") },
    { itemId: "tasks:t2", state: "SNOOZED", until: new Date("2026-11-17T00:00:00Z") },
  ] });
  const kinds = briefing.sections[0].items.map((i) => i.kind);
  assert.equal(kinds.length, 18); // 20 limit − dismissed − active snooze
  assert.ok(!kinds.includes("t0") && !kinds.includes("t1") && kinds.includes("t2"));
});

test("isHidden and sortItems helpers", () => {
  assert.equal(isHidden("a:b", [], now), false);
  assert.deepEqual(sortItems([item("a", "c", "info", { dueAt: "2026-12-01" }), item("a", "b", "danger"), item("a", "a", "info", { dueAt: "2026-11-20" })]).map((i) => i.kind), ["b", "a", "c"]);
});
