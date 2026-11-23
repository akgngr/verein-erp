import type { EgressCategory, EgressLegalBasis, EgressUnit } from "@/shared/egress/record-egress";
import type { PrivacyPresetId } from "./privacy-presets-core";

export type ProviderJurisdiction = "LOCAL" | "EU" | "US_DPF" | "GLOBAL";
export type RetentionPolicyType = "LOCAL_ONLY" | "ZERO_RETENTION" | "LOG_WINDOW" | "ACCOUNT_LIFETIME";

export type ProviderRetentionPolicy = {
  provider: string;
  category: EgressCategory;
  jurisdiction: ProviderJurisdiction;
  policyType: RetentionPolicyType;
  retentionDays: number | null;
  noteKey: string;
};

/**
 * Provider-side data retention metadata separated from configuration and actual transfers (B001 F2).
 */
export const PROVIDER_RETENTION_POLICIES: readonly ProviderRetentionPolicy[] = [
  { provider: "local", category: "AI_INFERENCE", jurisdiction: "LOCAL", policyType: "LOCAL_ONLY", retentionDays: 0, noteKey: "system.egress.retention.local" },
  { provider: "mistral", category: "AI_INFERENCE", jurisdiction: "EU", policyType: "ZERO_RETENTION", retentionDays: 0, noteKey: "system.egress.retention.mistral" },
  { provider: "anthropic", category: "AI_INFERENCE", jurisdiction: "US_DPF", policyType: "LOG_WINDOW", retentionDays: 30, noteKey: "system.egress.retention.anthropic" },
  { provider: "openai", category: "AI_INFERENCE", jurisdiction: "US_DPF", policyType: "LOG_WINDOW", retentionDays: 30, noteKey: "system.egress.retention.openai" },
  { provider: "smtp", category: "EMAIL", jurisdiction: "GLOBAL", policyType: "LOG_WINDOW", retentionDays: 14, noteKey: "system.egress.retention.smtp" },
  { provider: "web_push", category: "NOTIFICATION", jurisdiction: "GLOBAL", policyType: "LOG_WINDOW", retentionDays: 1, noteKey: "system.egress.retention.web_push" },
  { provider: "seven", category: "CAMPAIGN", jurisdiction: "EU", policyType: "LOG_WINDOW", retentionDays: 90, noteKey: "system.egress.retention.seven" },
  { provider: "twilio", category: "CAMPAIGN", jurisdiction: "US_DPF", policyType: "ACCOUNT_LIFETIME", retentionDays: null, noteKey: "system.egress.retention.twilio" },
  { provider: "telegram", category: "CAMPAIGN", jurisdiction: "GLOBAL", policyType: "ACCOUNT_LIFETIME", retentionDays: null, noteKey: "system.egress.retention.telegram" },
  { provider: "whatsapp_meta", category: "CAMPAIGN", jurisdiction: "US_DPF", policyType: "LOG_WINDOW", retentionDays: 30, noteKey: "system.egress.retention.whatsapp_meta" },
  { provider: "gocardless", category: "BANKING", jurisdiction: "EU", policyType: "LOG_WINDOW", retentionDays: 90, noteKey: "system.egress.retention.gocardless" },
  { provider: "google", category: "CALENDAR_SYNC", jurisdiction: "US_DPF", policyType: "ACCOUNT_LIFETIME", retentionDays: null, noteKey: "system.egress.retention.google" },
  { provider: "apple", category: "CALENDAR_SYNC", jurisdiction: "US_DPF", policyType: "ACCOUNT_LIFETIME", retentionDays: null, noteKey: "system.egress.retention.apple" },
  { provider: "outlook", category: "CALENDAR_SYNC", jurisdiction: "US_DPF", policyType: "ACCOUNT_LIFETIME", retentionDays: null, noteKey: "system.egress.retention.outlook" },
  { provider: "open_meteo", category: "EXTERNAL_API", jurisdiction: "EU", policyType: "ZERO_RETENTION", retentionDays: 0, noteKey: "system.egress.retention.open_meteo" },
  { provider: "open_er_api", category: "EXTERNAL_API", jurisdiction: "GLOBAL", policyType: "ZERO_RETENTION", retentionDays: 0, noteKey: "system.egress.retention.open_er_api" },
];

export type EgressLedgerRowInput = {
  moduleKey: string;
  category: string;
  provider: string;
  volume: number;
  count: number;
  unit: string;
  legalBasis: string;
  occurredAt: Date;
};

export type EgressModuleConfigItem = {
  moduleKey: string;
  isEnabled: boolean;
  category: EgressCategory;
  providers: readonly string[];
};

export type EgressTransferSummaryRow = {
  moduleKey: string;
  category: EgressCategory | string;
  provider: string;
  legalBasis: EgressLegalBasis | string;
  unit: EgressUnit | string;
  callCount: number;
  totalVolume: number;
  lastOccurredAt: string;
};

export type EgressRetentionReportItem = ProviderRetentionPolicy & {
  hadTransfersInPeriod: boolean;
};

export type MonthlyEgressReport = {
  configuration: {
    activePreset: PrivacyPresetId | null;
    modules: EgressModuleConfigItem[];
    ai: {
      enabled: boolean;
      configuredProviders: readonly string[];
      selfHostedConfigured: boolean;
    };
  };
  actualTransfers: {
    period: {
      year: number;
      month: number;
      from: string;
      to: string;
    };
    totalCalls: number;
    totalVolume: number;
    entries: EgressTransferSummaryRow[];
    immutabilityNoticeKey: string;
  };
  providerRetention: EgressRetentionReportItem[];
};

export function resolveMonthWindow(year?: number, month?: number, now = new Date()): {
  year: number;
  month: number;
  start: Date;
  end: Date;
} {
  const y = typeof year === "number" && Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : now.getUTCFullYear();
  const m = typeof month === "number" && Number.isInteger(month) && month >= 1 && month <= 12 ? month : now.getUTCMonth() + 1;
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  return { year: y, month: m, start, end };
}

/**
 * Pure monthly egress report builder (B001 F2a).
 * Separates current configuration, historical actual transfers, and provider-side retention.
 */
export function buildMonthlyEgressReport(input: {
  year: number;
  month: number;
  start: Date;
  end: Date;
  activePreset: PrivacyPresetId | null;
  modules: EgressModuleConfigItem[];
  aiEnabled: boolean;
  configuredAiProviders: readonly string[];
  rows: readonly EgressLedgerRowInput[];
}): MonthlyEgressReport {
  const grouped = new Map<string, EgressTransferSummaryRow>();
  const transferredProviders = new Set<string>();
  let totalCalls = 0;
  let totalVolume = 0;

  for (const row of input.rows) {
    totalCalls += row.count;
    totalVolume += row.volume;
    transferredProviders.add(row.provider);

    const key = `${row.moduleKey}|${row.category}|${row.provider}|${row.legalBasis}|${row.unit}`;
    const existing = grouped.get(key);
    const iso = row.occurredAt.toISOString();
    if (!existing) {
      grouped.set(key, {
        moduleKey: row.moduleKey,
        category: row.category,
        provider: row.provider,
        legalBasis: row.legalBasis,
        unit: row.unit,
        callCount: row.count,
        totalVolume: row.volume,
        lastOccurredAt: iso,
      });
    } else {
      existing.callCount += row.count;
      existing.totalVolume += row.volume;
      if (iso > existing.lastOccurredAt) {
        existing.lastOccurredAt = iso;
      }
    }
  }

  const entries = Array.from(grouped.values()).sort(
    (a, b) => b.callCount - a.callCount || a.moduleKey.localeCompare(b.moduleKey) || a.provider.localeCompare(b.provider),
  );

  const providerRetention: EgressRetentionReportItem[] = PROVIDER_RETENTION_POLICIES.map((policy) => ({
    ...policy,
    hadTransfersInPeriod: transferredProviders.has(policy.provider),
  }));

  return {
    configuration: {
      activePreset: input.activePreset,
      modules: [...input.modules].sort((a, b) => a.moduleKey.localeCompare(b.moduleKey)),
      ai: {
        enabled: input.aiEnabled,
        configuredProviders: [...input.configuredAiProviders],
        selfHostedConfigured: input.configuredAiProviders.includes("local"),
      },
    },
    actualTransfers: {
      period: {
        year: input.year,
        month: input.month,
        from: input.start.toISOString(),
        to: input.end.toISOString(),
      },
      totalCalls,
      totalVolume,
      entries,
      immutabilityNoticeKey: "system.egress.immutabilityNotice",
    },
    providerRetention,
  };
}
