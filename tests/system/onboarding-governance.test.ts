import assert from "node:assert/strict";
import test from "node:test";

import { auditDateRange } from "@/modules/audit/queries/list-audit-logs";
import { summarizeAutomationHealth } from "@/modules/automation/queries/health-snapshot";
import { settingsPermissions as moduleSettings, systemPermissions as moduleSystem } from "@/modules/system/permissions";
import { isAiProviderAllowed, parseAllowedAiProviders } from "@/modules/system/services/privacy-policy";
import { findPresetBlockers } from "@/modules/system/services/privacy-presets-core";
import { MODULE_PRESETS, PRESET_MANAGED_MODULES } from "@/modules/system/services/setup";
import { planDefaultMappings } from "@/modules/system/services/setup-accounting-mappings-core";
import { isAccessApproved } from "@/shared/modules/module-access";
import { can } from "@/shared/permissions/define";
import { settingsPermissions, systemPermissions } from "@/shared/permissions/system";

// #583: Kurulum, yönetişim ve sağlık kokpiti (veritabanı gerektirmez).

test("CORE module access is always approved; OFFICIAL/EXTENSION keep the signature rule", () => {
  const access = [{ module: "automation", operations: ["read" as const] }];
  assert.equal(isAccessApproved({ category: "CORE", access }, undefined), true, "fresh install");
  assert.equal(isAccessApproved({ category: "CORE", access }, { signature: "old", approvedAt: "", approvedBy: "" }), true, "after an update");
  assert.equal(isAccessApproved({ category: "EXTENSION", access }, undefined), false);
  assert.equal(isAccessApproved({ category: "OFFICIAL", access }, { signature: "old", approvedAt: "", approvedBy: "" }), false);
});

test("automation health groups failed and running executions per source module", () => {
  const now = new Date("2030-01-01T12:00:00Z");
  const staleBefore = new Date(now.getTime() - 5 * 60 * 1000);
  const health = summarizeAutomationHealth(
    [
      { sourceModule: "mailings", status: "FAILED", lastErrorCode: "MAIL_NOT_CONFIGURED", heartbeatAt: null, updatedAt: now },
      { sourceModule: "mailings", status: "RUNNING", lastErrorCode: null, heartbeatAt: new Date("2030-01-01T11:59:00Z"), updatedAt: now },
      { sourceModule: "exports", status: "RUNNING", lastErrorCode: null, heartbeatAt: new Date("2030-01-01T11:00:00Z"), updatedAt: now },
    ],
    staleBefore,
  );
  assert.deepEqual(health.failed, { mailings: [{ code: "MAIL_NOT_CONFIGURED" }] });
  assert.equal(health.running.mailings?.activeCount, 1);
  assert.equal(health.running.mailings?.isStale, false);
  assert.equal(health.running.exports?.isStale, true);
});

test("privacy AI policy: no preset allows all, a preset restricts, a corrupt value allows none", () => {
  assert.equal(parseAllowedAiProviders(null), null);
  assert.equal(isAiProviderAllowed(null, "openai"), true);
  const localOnly = parseAllowedAiProviders(JSON.stringify(["local"]));
  assert.deepEqual(localOnly, ["local"]);
  assert.equal(isAiProviderAllowed(localOnly, "local"), true);
  assert.equal(isAiProviderAllowed(localOnly, "openai"), false);
  assert.deepEqual(parseAllowedAiProviders("{not json"), []);
  assert.equal(isAiProviderAllowed(parseAllowedAiProviders("{not json"), "local"), false, "fail closed");
});

test("privacy presets are blocked by unmet dependencies, missing approval and active dependents", () => {
  const modules = [
    { key: "accounting" },
    { key: "sepa", requires: [{ module: "accounting" }] },
    { key: "mailings", requires: [{ module: "automation" }] },
    { key: "automation" },
  ];
  const change = (moduleKey: string, currentEnabled: boolean, targetEnabled: boolean) => ({ moduleKey, currentEnabled, targetEnabled, changed: currentEnabled !== targetEnabled });
  const blockers = findPresetBlockers({
    moduleChanges: [change("mailings", false, true), change("accounting", true, false)],
    modules,
    currentEnabled: (key) => key === "accounting" || key === "sepa",
    protectedKeys: new Set(),
    accessApproved: (key) => key !== "mailings",
  });
  assert.deepEqual(
    blockers.map((item) => [item.moduleKey, item.reason, item.modules]),
    [
      ["mailings", "requires", ["automation"]],
      ["mailings", "approval", []],
      ["accounting", "dependents", ["sepa"]],
    ],
  );
  const clean = findPresetBlockers({
    moduleChanges: [change("sepa", true, false), change("accounting", true, false)],
    modules,
    currentEnabled: (key) => key === "accounting" || key === "sepa",
    protectedKeys: new Set(),
    accessApproved: () => true,
  });
  assert.deepEqual(clean, [], "disabling the dependent together is fine");
});

test("settings/system permissions have a single definition (TAX_ADVISOR may open settings)", () => {
  assert.equal(moduleSettings, settingsPermissions);
  assert.equal(moduleSystem, systemPermissions);
  assert.equal(can("TAX_ADVISOR", moduleSettings, "view", null), true);
});

test("Verein preset includes SEPA, CRM, mailings and grants and the wizard manages them", () => {
  for (const key of ["sepa", "crm", "mailings", "grants"]) {
    assert.ok(MODULE_PRESETS.VEREIN.includes(key), key);
    assert.ok(PRESET_MANAGED_MODULES.includes(key), key);
  }
});

test("setup fills only empty accounting mappings with the preset accounts and categories", () => {
  const accounts = [{ id: "bank-1", type: "BANK" }, { id: "cash-1", type: "CASH" }];
  const categories = [{ id: "cat-don", name: "Spenden" }, { id: "cat-fee", name: "Mitgliedsbeiträge" }];
  const empty = { memberFeeCategoryId: null, cashAccountId: null, bankAccountId: null, donationCategoryId: null };
  const plan = planDefaultMappings(empty, accounts, categories);
  assert.deepEqual(plan.next, { cashAccountId: "cash-1", bankAccountId: "bank-1", donationCategoryId: "cat-don", memberFeeCategoryId: "cat-fee" });
  assert.equal(plan.filled.length, 4);
  const kept = planDefaultMappings({ ...empty, cashAccountId: "custom-cash" }, accounts, categories);
  assert.equal(kept.next.cashAccountId, "custom-cash");
  assert.ok(!kept.filled.includes("cashAccountId"));
  assert.deepEqual(planDefaultMappings(empty, [], []).filled, [], "nothing to map");
});

test("audit date filter uses whole UTC days and ignores malformed values", () => {
  assert.deepEqual(auditDateRange({ from: "2030-01-02", to: "2030-01-03" }), {
    createdAt: { gte: new Date("2030-01-02T00:00:00.000Z"), lte: new Date("2030-01-03T23:59:59.999Z") },
  });
  assert.deepEqual(auditDateRange({ from: "02.01.2030" }), {});
  assert.deepEqual(auditDateRange({}), {});
});
