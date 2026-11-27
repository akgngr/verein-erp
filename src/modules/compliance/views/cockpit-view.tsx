import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { AccessDenied } from "@/shared/components/ui/access-denied";
import { PageHeader } from "@/shared/components/ui/page-header";
import { StatusChip } from "@/shared/components/ui/status-chip";
import { can } from "@/shared/permissions/define";

import { ComplianceCockpitToolbar } from "../components/cockpit-toolbar";
import { ComplianceRowActions } from "../components/row-actions";
import { compliancePermissions } from "../permissions";
import { COMPLIANCE_RULES } from "../rules";
import { trafficLight } from "../services/engine";
import { formatComputedValue } from "../services/export-report";
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
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  if (!years.includes(year)) years.push(year);
  years.sort((a, b) => b - a);

  const preview = params.preview === "1" && can(user.role, compliancePermissions, "update");
  const [t, locale, rows] = await Promise.all([getTranslations("compliance"), getLocale(), runCockpit(user, { year, preview })]);
  const lang = locale === "de" ? "de" : "tr";
  const areas = ["status", "finance", "people"].map((key) => {
    const areaRows = rows.filter((row) => area(row) === key);
    return {
      key,
      rows: areaRows,
      light: trafficLight(areaRows.filter((row) => row.mode !== "disabled").flatMap((row) => row.findings)),
    };
  });
  const canCreate = can(user.role, compliancePermissions, "create");
  const draftOnly = COMPLIANCE_RULES.length > 0 && COMPLIANCE_RULES.every((rule) => rule.review.status !== "reviewed");
  const canUpdate = can(user.role, compliancePermissions, "update");
  const advisorHref = canUpdate ? "/ayarlar/kullanicilar" : "/muhasebe";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("title", { year })} description={t("description")} />
      <p role="note" className="rounded-xl border border-warning-300 bg-warning-50 p-3 text-sm font-medium text-warning-800 dark:bg-warning-500/10 dark:text-warning-300">
        {t("disclaimer")}
      </p>
      <ComplianceCockpitToolbar year={year} years={years} preview={preview} canPreview={canUpdate} />
      {preview ? <p className="text-sm text-ink-500">{t("previewNotice")}</p> : null}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label={t("areasLabel")}>
        {areas.map(({ key, light }) => (
          <a
            key={key}
            href={`#area-${key}`}
            className="flex items-center justify-between rounded-xl border border-ink-200 bg-surface p-4 transition-colors hover:border-ink-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="font-medium">{t(`areas.${key}` as never)}</span>
            <StatusChip tone={LIGHT_TONE[light]}>{t(`light.${light}` as never)}</StatusChip>
          </a>
        ))}
      </section>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">
          {/* #585: Kurallar hukuki inceleme ("reviewed") olmadan yalnız yönetici önizlemesinde çalışır. */}
          {draftOnly ? t(canUpdate ? "draftOnlyAdmin" : "draftOnly") : t("empty")}
        </p>
      ) : null}
      {areas.map(({ key, rows: areaRows }) =>
        areaRows.length === 0 ? null : (
          <section key={key} id={`area-${key}`} aria-labelledby={`area-heading-${key}`} className="space-y-3">
            <h2 id={`area-heading-${key}`} className="text-base font-semibold text-ink-900">
              {t(`areas.${key}` as never)}
            </h2>
            <ul className="flex flex-col gap-3">
              {areaRows.map((row) => (
                <li key={row.rule.id} className="space-y-2 rounded-xl border border-ink-200 bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{row.rule.title[lang]}</span>
                    <StatusChip tone={row.mode === "disabled" ? "default" : LIGHT_TONE[trafficLight(row.findings)]}>
                      {row.mode === "disabled" ? t("mode.disabled") : t(`light.${trafficLight(row.findings)}` as never)}
                    </StatusChip>
                    {row.mode === "preview" ? <StatusChip tone="secondary">{t("mode.preview")}</StatusChip> : null}
                    <span className="text-xs text-ink-500">
                      {t("version", { version: row.rule.version, from: row.rule.effective.from })}
                      {row.rule.effective.to ? ` – ${row.rule.effective.to}` : ""}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                    <span>{t("legalSource")}:</span>
                    {row.rule.legalSource.map((source) =>
                      source.url ? (
                        <a
                          key={source.norm}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 underline hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {source.norm}
                          <ExternalLink size={11} aria-hidden="true" />
                        </a>
                      ) : (
                        <span key={source.norm}>{source.norm}</span>
                      ),
                    )}
                  </div>
                  {row.mode === "disabled" ? <p className="text-sm text-ink-500">{t("disabledReason", { reason: row.disabledReason ?? "" })}</p> : null}
                  {row.findings.map((finding, index) => (
                    <div key={`${finding.ruleId}-${index}`} className="space-y-1 text-sm">
                      {finding.status === "triggered" && finding.message ? <p>{finding.message[lang]}</p> : null}
                      {finding.status === "ok" ? <p className="text-ink-500">{t("ok")}</p> : null}
                      {finding.status === "unchecked" ? <p className="text-ink-500">{t(`unchecked.${String(finding.facts.reason)}` as never)}</p> : null}
                      <p className="text-xs text-ink-500">
                        {t("ui.computedValue")}: {formatComputedValue(finding.facts, lang)}
                      </p>
                      {finding.status === "triggered" && row.mode === "active" && canCreate && row.rule.suggestedTask ? (
                        <ComplianceRowActions mode="task" ruleId={finding.ruleId} period={finding.period} refKey={typeof finding.facts.ref === "string" ? finding.facts.ref : ""} locale={lang} />
                      ) : null}
                    </div>
                  ))}
                  {canUpdate && row.mode !== "preview" ? <ComplianceRowActions mode="toggle" ruleId={row.rule.id} disabled={row.mode === "disabled"} /> : null}
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
      <p className="text-xs text-ink-500">
        {t("askAdvisor")}{" "}
        <Link href={advisorHref} className="font-medium underline hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {t("ui.askAdvisorLink")}
        </Link>
      </p>
    </div>
  );
}
