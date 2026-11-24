import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMonthlyEgressReport, resolveMonthWindow } from "@/modules/system/services/egress-report-core";
import { computePrivacyPresetDiff, PRIVACY_PRESETS, PRIVACY_PRESET_IDS } from "@/modules/system/services/privacy-presets-core";

describe("B001 F2b: immutable actual transfers vs configuration", () => {
  it("keeps historical external transfers despite the module now being disabled", () => {
    const period = resolveMonthWindow(2026, 11);
    const report = buildMonthlyEgressReport({
      ...period,
      activePreset: "Strict",
      modules: [
        { moduleKey: "campaign-sms", isEnabled: false, category: "CAMPAIGN", providers: ["seven"] },
        { moduleKey: "ai", isEnabled: false, category: "AI_INFERENCE", providers: ["openai"] },
      ],
      aiEnabled: false,
      configuredAiProviders: [],
      rows: [
        {
          moduleKey: "campaign-sms", category: "CAMPAIGN", provider: "seven",
          volume: 120, count: 2, unit: "bytes", legalBasis: "CONSENT",
          occurredAt: new Date("2026-11-04T08:30:00.000Z"),
        },
        {
          moduleKey: "campaign-sms", category: "CAMPAIGN", provider: "seven",
          volume: 80, count: 1, unit: "bytes", legalBasis: "CONSENT",
          occurredAt: new Date("2026-11-08T08:30:00.000Z"),
        },
      ],
    });
    assert.equal(report.configuration.activePreset, "Strict");
    assert.equal(report.configuration.modules[0].isEnabled, false);
    assert.equal(report.actualTransfers.totalCalls, 3);
    assert.equal(report.actualTransfers.totalVolume, 200);
    assert.equal(report.actualTransfers.entries.length, 1);
    assert.equal(report.actualTransfers.entries[0].callCount, 3);
    assert.equal(report.actualTransfers.entries[0].totalVolume, 200);
    assert.equal(report.actualTransfers.entries[0].legalBasis, "CONSENT");
    assert.equal(report.actualTransfers.period.from, "2026-11-01T00:00:00.000Z");
    assert.equal(report.actualTransfers.period.to, "2026-12-01T00:00:00.000Z");
    assert.equal(report.providerRetention.find((row) => row.provider === "seven")?.hadTransfersInPeriod, true);
  });

  it("keeps provider policies distinct from actual transfers when none occurred", () => {
    const period = resolveMonthWindow(2026, 2);
    const report = buildMonthlyEgressReport({
      ...period, activePreset: null, modules: [], aiEnabled: false,
      configuredAiProviders: [], rows: [],
    });
    assert.equal(report.actualTransfers.entries.length, 0);
    assert.equal(report.actualTransfers.totalCalls, 0);
    assert.ok(report.providerRetention.length > 0);
    assert.ok(report.providerRetention.every((row) => !row.hadTransfersInPeriod));
    assert.equal(report.actualTransfers.period.to, "2026-03-01T00:00:00.000Z");
  });
});

describe("B001 F2b: privacy preset diff", () => {
  it("offers exactly three explicit profiles and never switches state when diff is computed", () => {
    assert.deepEqual(PRIVACY_PRESET_IDS, ["Strict", "Standard", "Connected"]);
    const original = Object.freeze({ ai: true, banking: true, weather: false });
    const diff = computePrivacyPresetDiff({
      presetId: "Strict", currentPresetId: "Connected",
      currentModuleStates: original, configuredAiProviders: ["anthropic"],
    });
    assert.equal(original.ai, true);
    assert.equal(diff.currentPresetId, "Connected");
    assert.equal(diff.hasChanges, true);
    assert.equal(diff.aiChanges.requiresSelfHostedSetup, true);
    assert.deepEqual(diff.aiChanges.disallowedConfiguredProviders, ["anthropic"]);
    assert.ok(diff.moduleChanges.some((row) => row.moduleKey === "ai" && row.currentEnabled && !row.targetEnabled));
    assert.equal(PRIVACY_PRESETS.Strict.allowedAiProviders.includes("anthropic"), false);
  });
});
