import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { adapterFor } from "@/modules/ai/services/providers";
import { GoCardlessProvider } from "@/modules/banking/services/providers/gocardless";
import { channels as smsChannels } from "@/modules/campaign-sms/channels";
import { telegramCall } from "@/modules/campaign-telegram/services/telegram";
import { channels as whatsappChannels } from "@/modules/campaign-whatsapp/channels";
import {
  buildMonthlyEgressReport,
  resolveMonthWindow,
} from "@/modules/system/services/egress-report-core";
import {
  computePrivacyPresetDiff,
  PRIVACY_PRESETS,
} from "@/modules/system/services/privacy-presets-core";
import { syncFetch } from "@/shared/calendar/sync";
import { channelFetch } from "@/shared/campaigns/channel";
import {
  buildEgressRecord,
  setEgressSinkForTests,
  type EgressLedgerRecord,
} from "@/shared/egress/record-egress";

const originalFetch = globalThis.fetch;

afterEach(() => {
  setEgressSinkForTests(null);
  globalThis.fetch = originalFetch;
});

describe("B001 F2a: Data egress ledger contract", () => {
  it("strips any potential PII/payload fields and only retains metadata", () => {
    const dirtyInput = {
      moduleKey: "campaign-sms/user@example.com",
      category: "CAMPAIGN" as const,
      provider: "seven+4915123456789",
      volume: 128,
      count: 1,
      unit: "bytes" as const,
      legalBasis: "CONSENT" as const,
      // Attempted extra payload / PII fields at runtime
      payload: "Secret message to Max Mustermann",
      to: "+4915123456789",
      email: "max@example.com",
    };

    const record = buildEgressRecord(dirtyInput);
    const keys = Object.keys(record).sort();

    assert.deepEqual(keys, [
      "category",
      "count",
      "legalBasis",
      "moduleKey",
      "occurredAt",
      "provider",
      "unit",
      "volume",
    ]);
    assert.equal((record as Record<string, unknown>).payload, undefined);
    assert.equal((record as Record<string, unknown>).to, undefined);
    assert.equal((record as Record<string, unknown>).email, undefined);
    assert.equal(record.moduleKey, "campaign-sms_user_example_com");
    assert.equal(record.provider, "seven_4915123456789");
  });

  it("channelFetch records an egress entry with no PII for campaign-sms, campaign-whatsapp, and campaign-telegram", async () => {
    const captured: EgressLedgerRecord[] = [];
    setEgressSinkForTests((entry) => {
      captured.push(entry);
    });

    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: true, result: { message_id: 42 }, messages: [{ id: "m1", success: true }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;

    const smsResult = await smsChannels.channels[0].sendBatch(
      [{ to: "+4915111111111", toName: "Max Mustermann", subject: "", text: "Hallo Verein", reference: "camp-1" }],
      { provider: "seven", apiKey: "secret-key", sender: "Verein" },
    );
    assert.equal(smsResult[0].ok, true);

    const waResult = await whatsappChannels.channels[0].sendBatch(
      [{ to: "+4915111111111", toName: "Max Mustermann", subject: "", text: "Hallo WA", reference: "camp-2" }],
      { phoneNumberId: "1234567890", accessToken: "wa-token", templateName: "hello_de", templateLanguage: "de" },
    );
    assert.equal(waResult[0].ok, true);

    await telegramCall("123456:ABCDEF_fake_token_12345678901234567890", "sendMessage", {
      chat_id: "999999",
      text: "Hallo Telegram",
    });

    assert.equal(captured.length, 3);
    assert.equal(captured[0].moduleKey, "campaign-sms");
    assert.equal(captured[0].provider, "seven");
    assert.equal(captured[0].category, "CAMPAIGN");
    assert.equal(captured[1].moduleKey, "campaign-whatsapp");
    assert.equal(captured[1].provider, "whatsapp_meta");
    assert.equal(captured[2].moduleKey, "campaign-telegram");
    assert.equal(captured[2].provider, "telegram");

    const serialized = JSON.stringify(captured);
    assert.equal(serialized.includes("4915111111111"), false);
    assert.equal(serialized.includes("Max Mustermann"), false);
    assert.equal(serialized.includes("Hallo Verein"), false);
    assert.equal(serialized.includes("999999"), false);
  });

  it("channelFetch infers provider even when called without explicit egress metadata", async () => {
    const captured: EgressLedgerRecord[] = [];
    setEgressSinkForTests((entry) => {
      captured.push(entry);
    });

    globalThis.fetch = (async () => new Response("{}", { status: 200 })) as typeof fetch;

    await channelFetch(["api.open-meteo.com"], "https://api.open-meteo.com/v1/forecast?latitude=50.11&longitude=8.68");

    assert.equal(captured.length, 1);
    assert.equal(captured[0].provider, "open_meteo");
    assert.equal(captured[0].category, "EXTERNAL_API");
  });

  it("calendar syncFetch records egress entries for calendar-google / calendar-apple / calendar-outlook", async () => {
    const captured: EgressLedgerRecord[] = [];
    setEgressSinkForTests((entry) => {
      captured.push(entry);
    });

    globalThis.fetch = (async () => new Response("{}", { status: 200 })) as typeof fetch;

    await syncFetch({ key: "google", allowedHosts: ["googleapis.com"] }, "https://www.googleapis.com/calendar/v3/users/me/calendarList");
    await syncFetch({ key: "apple", allowedHosts: ["caldav.icloud.com"] }, "https://caldav.icloud.com/");
    await syncFetch({ key: "outlook", allowedHosts: ["graph.microsoft.com"] }, "https://graph.microsoft.com/v1.0/me");

    assert.equal(captured.length, 3);
    assert.deepEqual(
      captured.map((e) => ({ moduleKey: e.moduleKey, provider: e.provider, category: e.category })),
      [
        { moduleKey: "calendar-google", provider: "google", category: "CALENDAR_SYNC" },
        { moduleKey: "calendar-apple", provider: "apple", category: "CALENDAR_SYNC" },
        { moduleKey: "calendar-outlook", provider: "outlook", category: "CALENDAR_SYNC" },
      ],
    );
  });

  it("banking GoCardlessProvider records egress entries for token and API calls", async () => {
    const captured: EgressLedgerRecord[] = [];
    setEgressSinkForTests((entry) => {
      captured.push(entry);
    });

    let callIndex = 0;
    globalThis.fetch = (async () => {
      callIndex += 1;
      if (callIndex === 1) {
        return new Response(JSON.stringify({ access: "tok", access_expires: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify([{ id: "BANK_DE", name: "Test Bank" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const provider = new GoCardlessProvider("sec-id-test-1", "sec-key-test-1");
    const institutions = await provider.listInstitutions("de");

    assert.equal(institutions.length, 1);
    assert.equal(captured.length, 2);
    assert.equal(captured[0].moduleKey, "banking");
    assert.equal(captured[0].category, "BANKING");
    assert.equal(captured[0].provider, "gocardless");
    assert.equal(captured[0].legalBasis, "CONTRACT");
  });

  it("AI adapterFor records an egress entry when an inference call is attempted", async () => {
    const captured: EgressLedgerRecord[] = [];
    setEgressSinkForTests((entry) => {
      captured.push(entry);
    });

    const adapter = adapterFor({
      id: "openai",
      model: "gpt-4o-mini",
      apiKey: "sk-test-invalid",
      baseURL: null,
    });

    // Stub fetch so no real network call is made; OpenAI SDK will throw on 401 after beforeRequest runs
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "unauthorized" } }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;

    await assert.rejects(() =>
      adapter.run({
        model: "gpt-4o-mini",
        system: "Test system",
        turns: [{ role: "user", content: "Hello" }],
        tools: [],
        maxToolRounds: 1,
        beforeRequest: async () => undefined,
        executeTool: async () => ({ content: "", isError: false }),
      }),
    );

    assert.equal(captured.length, 1);
    assert.equal(captured[0].moduleKey, "ai");
    assert.equal(captured[0].category, "AI_INFERENCE");
    assert.equal(captured[0].provider, "openai");
    assert.ok(captured[0].volume > 0);
  });
});

describe("B001 F2a: Monthly report builder & privacy presets", () => {
  it("separates configuration, actual transfers, and provider retention even when module is disabled", () => {
    const window = resolveMonthWindow(2026, 11);
    const report = buildMonthlyEgressReport({
      year: window.year,
      month: window.month,
      start: window.start,
      end: window.end,
      activePreset: "Strict",
      modules: [
        { moduleKey: "campaign-sms", isEnabled: false, category: "CAMPAIGN", providers: ["seven", "twilio"] },
      ],
      aiEnabled: false,
      configuredAiProviders: ["local"],
      rows: [
        {
          moduleKey: "campaign-sms",
          category: "CAMPAIGN",
          provider: "seven",
          volume: 240,
          count: 3,
          unit: "bytes",
          legalBasis: "CONSENT",
          occurredAt: new Date("2026-11-10T10:00:00.000Z"),
        },
      ],
    });

    assert.equal(report.configuration.activePreset, "Strict");
    assert.equal(report.configuration.modules[0].isEnabled, false);
    assert.equal(report.actualTransfers.totalCalls, 3);
    assert.equal(report.actualTransfers.totalVolume, 240);
    assert.equal(report.actualTransfers.immutabilityNoticeKey, "system.egress.immutabilityNotice");

    const sevenPolicy = report.providerRetention.find((p) => p.provider === "seven");
    assert.ok(sevenPolicy);
    assert.equal(sevenPolicy.hadTransfersInPeriod, true);
  });

  it("defines Strict / Standard / Connected presets as data and recommends self-hosted AI for Strict", () => {
    assert.equal(PRIVACY_PRESETS.Strict.selfHostedRecommended, true);
    assert.equal(PRIVACY_PRESETS.Strict.recommendedAiProvider, "local");
    assert.equal(PRIVACY_PRESETS.Standard.selfHostedRecommended, false);
    assert.equal(PRIVACY_PRESETS.Connected.modules["campaign-whatsapp"], true);

    const diff = computePrivacyPresetDiff({
      presetId: "Strict",
      currentPresetId: "Connected",
      currentModuleStates: {
        ai: true,
        banking: true,
        "campaign-sms": true,
        weather: true,
      },
      configuredAiProviders: ["anthropic"],
    });

    assert.equal(diff.hasChanges, true);
    assert.equal(diff.changedModuleCount, 4);
    assert.equal(diff.aiChanges.selfHostedRecommended, true);
    assert.equal(diff.aiChanges.requiresSelfHostedSetup, true);
    assert.deepEqual(diff.aiChanges.disallowedConfiguredProviders, ["anthropic"]);
  });
});
