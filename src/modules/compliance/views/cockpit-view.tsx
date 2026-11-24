import { getLocale, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { StatusChip } from "@/shared/components/ui/status-chip";
import { can } from "@/shared/permissions/define";

import { ComplianceRowActions } from "../components/row-actions";
import { compliancePermissions } from "../permissions";
import { trafficLight } from "../services/engine";
import { runCockpit, type CockpitRow } from "../services/run";

const LIGHT_TONE = { green: "success", yellow: "warning", red: "danger", grey: "default" } as const;

function area(row: CockpitRow): string {
  return row.rule.id.split(".")[1]?.startsWith("uebungsleiter") ? "people" : row.rule.id.includes("funds") || row.rule.id.includes("economic") ? "finance" : "status";
}

/** Gemeinnützigkeit cockpit (ADR 0009): traffic light per area, findings with legal source, computed value, effective date. */
export async function ComplianceCockpitView({ searchParams }: { searchParams: Promise<{ year?: string; preview?: string }> }) {
  let user;
  try {
    user = await requirePermission(compliancePermissions, "view");
  } catch (error) {
    if (error instanceof ForbiddenError) return <AccessDenied />;
    throw error;
  }
  const params = await searchParams;
  const currentYear = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric" }).format(new Date()));
  const year = /^\d{4}$/.test(params.year ?? "") ? Number(params.year) : currentYear;
  const preview = params.preview === "1" && can(user.role, compliancePermissions, "update");
  const [t, locale, rows] = await Promise.all([getTranslations("compliance"), getLocale(), runCockpit(user, { year, preview })]);
  const lang = locale === "de" ? "de" : "tr";
  const areas = ["status", "finance", "people"].map((key) => ({ key, light: trafficLight(rows.filter((row) => row.mode !== "disabled" && area(row) === key).flatMap((row) => row.findings)) }));
  const canCreate = can(user.role, compliancePermissions, "create");
  const canUpdate = can(user.role, compliancePermissions, "update");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title", { year })} description={t("description")} />
      <p role="note" className="rounded-xl border border-warning-300 bg-warning-50 p-3 text-sm font-medium text-warning-800 dark:bg-warning-500/10 dark:text-warning-300">
        {t("disclaimer")}
      </p>
      {preview ? <p className="text-sm text-ink-500">{t("previewNotice")}</p> : null}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label={t("areasLabel")}>
        {areas.map(({ key, light }) => (
          <div key={key} className="flex items-center justify-between rounded-xl border border-ink-200 bg-surface p-4">
            <span className="font-medium">{t(`areas.${key}` as never)}</span>
            <StatusChip tone={LIGHT_TONE[light]}>{t(`light.${light}` as never)}</StatusChip>
          </div>
        ))}
      </section>
      {rows.length === 0 ? <p className="text-sm text-ink-500">{t("empty")}</p> : null}
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.rule.id} className="space-y-2 rounded-xl border border-ink-200 bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{row.rule.title[lang]}</span>
              <StatusChip tone={row.mode === "disabled" ? "default" : LIGHT_TONE[trafficLight(row.findings)]}>
                {row.mode === "disabled" ? t("mode.disabled") : t(`light.${trafficLight(row.findings)}` as never)}
              </StatusChip>
              {row.mode === "preview" ? <StatusChip tone="secondary">{t("mode.preview")}</StatusChip> : null}
              <span className="text-xs text-ink-500">{t("version", { version: row.rule.version, from: row.rule.effective.from })}</span>
            </div>
            <p className="text-xs text-ink-500">{t("legalSource")}: {row.rule.legalSource.map((source) => source.norm).join(" · ")}</p>
            {row.mode === "disabled" ? <p className="text-sm text-ink-500">{t("disabledReason", { reason: row.disabledReason ?? "" })}</p> : null}
            {row.findings.map((finding, index) => (
              <div key={`${finding.ruleId}-${index}`} className="text-sm">
                {finding.status === "triggered" && finding.message ? <p>{finding.message[lang]}</p> : null}
                {finding.status === "ok" ? <p className="text-ink-500">{t("ok")}</p> : null}
                {finding.status === "unchecked" ? <p className="text-ink-500">{t(`unchecked.${String(finding.facts.reason)}` as never)}</p> : null}
                {finding.status === "triggered" && row.mode === "active" && canCreate && row.rule.suggestedTask ? (
                  <ComplianceRowActions mode="task" ruleId={finding.ruleId} period={finding.period} refKey={typeof finding.facts.ref === "string" ? finding.facts.ref : ""} locale={lang} />
                ) : null}
              </div>
            ))}
            {canUpdate && row.mode !== "preview" ? <ComplianceRowActions mode="toggle" ruleId={row.rule.id} disabled={row.mode === "disabled"} /> : null}
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-500">{t("askAdvisor")}</p>
    </div>
  );
}
