import type { PermissionRequirement } from "../types/module";

/**
 * Compliance metric providers (ADR 0009, #414). A module exports aggregate-only metrics in
 * `src/modules/<module>/compliance.ts` → `export const compliance = defineComplianceMetrics({...})`;
 * `pnpm module:sync` collects them into `src/compliance-registry.ts`. The compliance module never queries
 * another module's tables. Providers are pure reads (no writes, no external calls), deterministic per tax year,
 * and return aggregates only. Per-person metrics use a stable non-name reference (member/teacher number or a
 * pseudonymous ref), never names.
 */
export type MetricValue =
  | { kind: "number"; value: number; unit: "cents" | "count" }
  | { kind: "date"; value: string | null; variant?: string } // ISO date; null = not recorded; variant selects params (e.g. notice type)
  | { kind: "perPerson"; unit: "cents"; rows: { ref: string; value: number }[] }
  | { kind: "missing"; reason: string };

export type MetricContext = {
  /** Tax year being evaluated. */
  year: number;
  /** "Today" (Europe/Berlin calendar day, ISO date). */
  today: string;
  /** The rule's reviewed params (thresholds stay in rule data, never in provider code). */
  params: Record<string, number | string | boolean>;
};

export type ComplianceMetric = {
  /** Global key "<module>.<name>", referenced by rule JSON `metric`. */
  key: string;
  /** The finding is shown only to users holding this permission (least privilege). */
  permission: PermissionRequirement;
  read: (context: MetricContext) => Promise<MetricValue>;
};

export type ModuleCompliance = { module: string; metrics: ComplianceMetric[] };

export const defineComplianceMetrics = (definition: ModuleCompliance): ModuleCompliance => definition;

/** Stable pseudonymous reference for people without a public number (never reversible to a name in the UI). */
export function pseudonymousRef(prefix: string, id: string): string {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619) >>> 0;
  return `${prefix}-${hash.toString(36).toUpperCase().padStart(6, "0").slice(-6)}`;
}

/** ISO date + whole years (UTC calendar). */
export function addYearsIso(iso: string, years: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  return date.toISOString().slice(0, 10);
}
