import "server-only";

import { getDb } from "@/shared/db";

export const EGRESS_CATEGORIES = [
  "AI_INFERENCE",
  "NOTIFICATION",
  "CAMPAIGN",
  "BANKING",
  "CALENDAR_SYNC",
  "EMAIL",
  "EXTERNAL_API",
] as const;

export type EgressCategory = (typeof EGRESS_CATEGORIES)[number];

export const EGRESS_LEGAL_BASES = [
  "CONSENT",
  "CONTRACT",
  "LEGAL_OBLIGATION",
  "LEGITIMATE_INTEREST",
] as const;

export type EgressLegalBasis = (typeof EGRESS_LEGAL_BASES)[number];

export const EGRESS_UNITS = ["bytes", "tokens", "messages", "requests"] as const;

export type EgressUnit = (typeof EGRESS_UNITS)[number];

export type RecordEgressInput = {
  moduleKey: string;
  category: EgressCategory;
  provider: string;
  volume?: number;
  count?: number;
  unit?: EgressUnit;
  legalBasis: EgressLegalBasis;
  occurredAt?: Date;
};

export type EgressLedgerRecord = {
  moduleKey: string;
  category: EgressCategory;
  provider: string;
  volume: number;
  count: number;
  unit: EgressUnit;
  legalBasis: EgressLegalBasis;
  occurredAt: Date;
};

export type EgressSink = (entry: EgressLedgerRecord) => void | Promise<void>;

const globalForEgress = globalThis as unknown as { __egressSink?: EgressSink | null };

/**
 * Registers an in-memory sink for contract tests so outbound adapters can be verified
 * without requiring a live database connection. Pass `null` to restore database persistence.
 */
export function setEgressSinkForTests(sink: EgressSink | null): void {
  globalForEgress.__egressSink = sink;
}

/**
 * Strips any characters that could smuggle emails, URLs, phone numbers, or tokens into
 * metadata identifiers (`moduleKey`, `provider`).
 */
function sanitizeIdentifier(value: string, fallback: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return cleaned || fallback;
}

function clampNonNegativeInt(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}

/**
 * Builds a strictly allowlisted, PII-free egress ledger record from caller input.
 * No payload, recipient address, or free-form text is ever accepted or stored.
 */
export function buildEgressRecord(input: RecordEgressInput): EgressLedgerRecord {
  const category = EGRESS_CATEGORIES.includes(input.category) ? input.category : "EXTERNAL_API";
  const legalBasis = EGRESS_LEGAL_BASES.includes(input.legalBasis)
    ? input.legalBasis
    : "LEGITIMATE_INTEREST";
  const unit = input.unit && EGRESS_UNITS.includes(input.unit) ? input.unit : "requests";

  return {
    moduleKey: sanitizeIdentifier(input.moduleKey, "unknown"),
    category,
    provider: sanitizeIdentifier(input.provider, "unknown"),
    volume: clampNonNegativeInt(input.volume, 0),
    count: Math.max(1, clampNonNegativeInt(input.count, 1)),
    unit,
    legalBasis,
    occurredAt: input.occurredAt instanceof Date ? input.occurredAt : new Date(),
  };
}

/**
 * Records a metadata-only external data transfer (egress) entry.
 * Failures are logged and never break the primary outbound operation.
 */
export async function recordEgress(input: RecordEgressInput): Promise<void> {
  const entry = buildEgressRecord(input);
  try {
    if (globalForEgress.__egressSink) {
      await globalForEgress.__egressSink(entry);
      return;
    }

    await getDb().systemEgressLedger.create({
      data: {
        moduleKey: entry.moduleKey,
        category: entry.category,
        provider: entry.provider,
        volume: entry.volume,
        count: entry.count,
        unit: entry.unit,
        legalBasis: entry.legalBasis,
        occurredAt: entry.occurredAt,
      },
    });
  } catch (error) {
    console.error("[egress] Veri cikis kaydi yazilamadi:", error);
  }
}
