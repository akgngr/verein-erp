import { addYearsIso, type MetricValue } from "@/shared/compliance/define";

import type { ComplianceRule } from "../rules/schema";

/**
 * Generic, pure rule evaluation (ADR 0009 §2, §4). Never acts; returns findings only.
 * Fail closed: a metric that is missing or of the wrong shape yields status "unchecked" (grey), never "ok".
 */
export type FindingStatus = "ok" | "triggered" | "unchecked";

export type Finding = {
  ruleId: string;
  ruleVersion: number;
  status: FindingStatus;
  severity: ComplianceRule["severity"];
  period: number;
  /** Aggregates only (amounts in cents, counts, dates, pseudonymous refs). */
  facts: Record<string, string | number>;
  message: { tr: string; de: string } | null;
};

const DAY_MS = 86_400_000;

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / DAY_MS);
}

export { addYearsIso };

/** Rule is active for the given tax year (by `effective` range). */
export function isEffective(rule: ComplianceRule, year: number): boolean {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  return rule.effective.from <= end && (rule.effective.to === null || rule.effective.to >= start);
}

function compare(op: ComplianceRule["condition"]["op"], actual: number, expected: number): boolean {
  switch (op) {
    case "lt": return actual < expected;
    case "lte": return actual <= expected;
    case "gt": return actual > expected;
    case "gte": return actual >= expected;
    case "eq": return actual === expected;
    default: return false;
  }
}

/** Threshold: a numeric condition value, or a param name (e.g. "thresholdCents"). */
function threshold(rule: ComplianceRule): number | null {
  const raw = rule.condition.value;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && typeof rule.params[raw] === "number") return rule.params[raw] as number;
  return null;
}

function fill(template: { tr: string; de: string }, facts: Record<string, string | number>): { tr: string; de: string } {
  const render = (text: string, locale: "tr" | "de") =>
    text.replace(/\{(\w+)\}/g, (_, key: string) => {
      const value = facts[key];
      if (value === undefined) return `{${key}}`;
      if (typeof value === "number" && /Cents$/.test(key)) return new Intl.NumberFormat(locale === "de" ? "de-DE" : "tr-TR", { style: "currency", currency: "EUR" }).format(value / 100);
      return String(value);
    });
  return { tr: render(template.tr, "tr"), de: render(template.de, "de") };
}

export function evaluateRule(rule: ComplianceRule, metric: MetricValue | null, context: { year: number; today: string }): Finding[] {
  const base = { ruleId: rule.id, ruleVersion: rule.version, severity: rule.severity, period: context.year };
  const unchecked = (reason: string): Finding[] => [{ ...base, status: "unchecked", facts: { reason }, message: null }];
  if (!metric) return unchecked("noProvider");
  const op = rule.condition.op;

  if (op === "missing") {
    const isMissing = metric.kind === "missing" || (metric.kind === "date" && metric.value === null);
    if (metric.kind === "missing" && metric.reason !== "notRecorded") return unchecked(metric.reason);
    return [{ ...base, status: isMissing ? "triggered" : "ok", facts: { year: context.year }, message: isMissing ? fill(rule.finding, { year: context.year }) : null }];
  }
  if (metric.kind === "missing") return unchecked(metric.reason);

  if (op === "daysUntilLte") {
    if (metric.kind !== "date") return unchecked("wrongShape");
    if (metric.value === null) return unchecked("notRecorded");
    const variantYears = metric.variant !== undefined ? rule.params[`addYears.${metric.variant}`] : undefined;
    const addYears = typeof variantYears === "number" ? variantYears : typeof rule.params.addYears === "number" ? rule.params.addYears : 0;
    const due = addYears ? addYearsIso(metric.value, addYears) : metric.value;
    const days = daysBetween(context.today, due);
    const limit = threshold(rule);
    if (limit === null) return unchecked("badRule");
    const facts = { date: metric.value, dueDate: due, days, year: context.year };
    return [{ ...base, status: days <= limit ? "triggered" : "ok", facts, message: days <= limit ? fill(rule.finding, facts) : null }];
  }

  const limit = threshold(rule);
  if (limit === null) return unchecked("badRule");
  if (metric.kind === "number") {
    const lag = typeof rule.params.lagYears === "number" ? rule.params.lagYears : 0;
    const facts = { value: metric.value, valueCents: metric.value, thresholdCents: limit, threshold: limit, year: context.year, lagYear: context.year - lag };
    const hit = compare(op, metric.value, limit);
    return [{ ...base, status: hit ? "triggered" : "ok", facts, message: hit ? fill(rule.finding, facts) : null }];
  }
  if (metric.kind === "perPerson") {
    const hits = metric.rows.filter((row) => compare(op, row.value, limit));
    if (!hits.length) return [{ ...base, status: "ok", facts: { people: metric.rows.length, year: context.year }, message: null }];
    return hits.map((row) => {
      const facts = { ref: row.ref, valueCents: row.value, thresholdCents: limit, year: context.year };
      return { ...base, status: "triggered" as const, facts, message: fill(rule.finding, facts) };
    });
  }
  return unchecked("wrongShape");
}

/** Traffic light: red if any critical triggered, yellow if any warn triggered, grey if anything unchecked, else green. */
export function trafficLight(findings: readonly Finding[]): "green" | "yellow" | "red" | "grey" {
  if (findings.some((f) => f.status === "triggered" && f.severity === "critical")) return "red";
  if (findings.some((f) => f.status === "triggered" && f.severity === "warn")) return "yellow";
  if (findings.length === 0 || findings.some((f) => f.status === "unchecked")) return "grey";
  return "green";
}
