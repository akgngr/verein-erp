import "server-only";

import { moduleComplianceRegistry } from "@/compliance-registry";
import { listUsableModuleKeys } from "@/modules/system/automation";
import type { ComplianceMetric, MetricValue } from "@/shared/compliance/define";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";

import { COMPLIANCE_RULES } from "../rules";
import type { ComplianceRule } from "../rules/schema";
import { evaluateRule, isEffective, type Finding } from "./engine";

export type CockpitRow = {
  rule: Pick<ComplianceRule, "id" | "version" | "title" | "legalSource" | "effective" | "severity" | "suggestedTask" | "review">;
  mode: "active" | "preview" | "disabled";
  disabledReason?: string;
  findings: Finding[];
};

function berlinToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function metricByKey(): Map<string, { module: string; metric: ComplianceMetric }> {
  return new Map(moduleComplianceRegistry.flatMap((entry) => entry.metrics.map((metric) => [metric.key, { module: entry.module, metric }] as const)));
}

/**
 * Evaluates the rules visible to this user (ADR 0009). Reviewed + effective rules run; drafts run only in
 * preview for admins (labelled, never persisted). A rule whose provider module is unusable or whose read
 * fails is "unchecked" (fail closed). Findings are hidden from users without the provider's permission.
 *
 * #585: Evaluation is side-effect free by default (page views/GET no longer write). Findings are persisted
 * only with `persist: true`, i.e. from an explicit user action (`onlyRuleId` narrows the run to one rule).
 */
export async function runCockpit(user: { role: Role }, input: { year: number; now?: Date; preview?: boolean; persist?: boolean; onlyRuleId?: string }): Promise<CockpitRow[]> {
  const now = input.now ?? new Date();
  const today = berlinToday(now);
  const [usable, states] = await Promise.all([listUsableModuleKeys(), getDb().complianceRuleState.findMany()]);
  const stateById = new Map(states.map((state) => [state.ruleId, state]));
  const metrics = metricByKey();
  const rows: CockpitRow[] = [];
  for (const rule of COMPLIANCE_RULES) {
    if (input.onlyRuleId && rule.id !== input.onlyRuleId) continue;
    if (rule.review.status === "retired" || !isEffective(rule, input.year)) continue;
    const isDraft = rule.review.status === "draft";
    if (isDraft && !input.preview) continue;
    const provider = metrics.get(rule.metric);
    if (provider && !can(user.role, provider.metric.permission.definition, provider.metric.permission.action)) continue;
    const meta = { id: rule.id, version: rule.version, title: rule.title, legalSource: rule.legalSource, effective: rule.effective, severity: rule.severity, suggestedTask: rule.suggestedTask, review: rule.review };
    const state = stateById.get(rule.id);
    if (state?.disabled) {
      rows.push({ rule: meta, mode: "disabled", disabledReason: state.reason, findings: [] });
      continue;
    }
    let value: MetricValue | null = null;
    if (provider && usable.includes(provider.module)) {
      value = await provider.metric.read({ year: input.year, today, params: rule.params }).catch(() => ({ kind: "missing", reason: "providerError" }) as const);
    } else if (provider) {
      value = { kind: "missing", reason: "moduleUnavailable" };
    }
    const findings = evaluateRule(rule, value, { year: input.year, today });
    rows.push({ rule: meta, mode: isDraft ? "preview" : "active", findings });
    if (!isDraft && input.persist) await persistFindings(findings);
  }
  return rows;
}

async function persistFindings(findings: Finding[]): Promise<void> {
  const db = getDb();
  await db.$transaction(findings.map((finding) => {
    const refKey = typeof finding.facts.ref === "string" ? finding.facts.ref : "";
    const data = { ruleVersion: finding.ruleVersion, status: finding.status, severity: finding.severity, facts: finding.facts, evaluatedAt: new Date() };
    return db.complianceFinding.upsert({
      where: { ruleId_period_refKey: { ruleId: finding.ruleId, period: finding.period, refKey } },
      create: { ruleId: finding.ruleId, period: finding.period, refKey, ...data },
      update: data,
    });
  }));
}
