import "server-only";

import { listProviderStatus } from "@/modules/ai/server";
import { getDb } from "@/shared/db";
import type { EgressCategory } from "@/shared/egress/record-egress";

import {
  buildMonthlyEgressReport,
  resolveMonthWindow,
  type EgressModuleConfigItem,
  type MonthlyEgressReport,
} from "./egress-report-core";
import { getEffectiveModuleStates } from "./module-state-store";
import { getActivePrivacyPreset } from "./privacy-presets";

export * from "./egress-report-core";

const EGRESS_MODULE_DESCRIPTORS: readonly {
  moduleKey: string;
  category: EgressCategory;
  providers: readonly string[];
}[] = [
  { moduleKey: "ai", category: "AI_INFERENCE", providers: ["local", "mistral", "anthropic", "openai"] },
  { moduleKey: "banking", category: "BANKING", providers: ["gocardless"] },
  { moduleKey: "calendar-apple", category: "CALENDAR_SYNC", providers: ["apple"] },
  { moduleKey: "calendar-google", category: "CALENDAR_SYNC", providers: ["google"] },
  { moduleKey: "calendar-outlook", category: "CALENDAR_SYNC", providers: ["outlook"] },
  { moduleKey: "campaign-sms", category: "CAMPAIGN", providers: ["seven", "twilio"] },
  { moduleKey: "campaign-telegram", category: "CAMPAIGN", providers: ["telegram"] },
  { moduleKey: "campaign-whatsapp", category: "CAMPAIGN", providers: ["whatsapp_meta"] },
  { moduleKey: "finance", category: "EXTERNAL_API", providers: ["open_er_api"] },
  { moduleKey: "mail", category: "EMAIL", providers: ["smtp"] },
  { moduleKey: "notifications", category: "NOTIFICATION", providers: ["smtp", "web_push", "telegram", "seven", "twilio"] },
  { moduleKey: "weather", category: "EXTERNAL_API", providers: ["open_meteo"] },
];

/**
 * Loads configuration, monthly SystemEgressLedger entries, and provider retention policies
 * into a structured report for the F2b UI.
 */
export async function getMonthlyEgressReport(input?: {
  year?: number;
  month?: number;
}): Promise<MonthlyEgressReport> {
  const window = resolveMonthWindow(input?.year, input?.month);

  const [activePreset, effectiveStates, aiStatuses, rows] = await Promise.all([
    getActivePrivacyPreset(),
    getEffectiveModuleStates(),
    listProviderStatus().catch(() => []),
    getDb().systemEgressLedger.findMany({
      where: {
        occurredAt: {
          gte: window.start,
          lt: window.end,
        },
      },
      select: {
        moduleKey: true,
        category: true,
        provider: true,
        volume: true,
        count: true,
        unit: true,
        legalBasis: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: "desc" },
    }),
  ]);

  const modules: EgressModuleConfigItem[] = EGRESS_MODULE_DESCRIPTORS.map((desc) => ({
    moduleKey: desc.moduleKey,
    isEnabled: effectiveStates[desc.moduleKey] ?? false,
    category: desc.category,
    providers: desc.providers,
  }));

  const configuredAiProviders = aiStatuses.filter((s) => s.ready).map((s) => s.id);
  const aiEnabled = effectiveStates["ai"] ?? false;

  return buildMonthlyEgressReport({
    year: window.year,
    month: window.month,
    start: window.start,
    end: window.end,
    activePreset,
    modules,
    aiEnabled,
    configuredAiProviders,
    rows,
  });
}
