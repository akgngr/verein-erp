"use client";

import { useState } from "react";
import { Download, Presentation, TrendingUp, TrendingDown, Landmark, Layers, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { ActionButton } from "@/shared/components/ui/action-button";
import { SurfaceCard } from "@/shared/components/ui/surface-card";
import { formatMoney } from "@/shared/money";

import { AssemblyReportSlides } from "../components/assembly-report-slides";
import type { TreasurerReportResult } from "../services/treasurer-report";
import { getTreasurerReportSummary } from "../utils/treasurer-report-summary";

export function TreasurerReportSlideView({
  report,
  lang,
}: {
  report: TreasurerReportResult;
  lang: "tr" | "de";
}) {
  const [slideMode, setSlideMode] = useState(false);
  const t = useTranslations("accounting.reports.treasurer");

  const SPHERE_TITLES: Record<string, string> = {
    IDEELL: t("spheres.ideell"),
    ASSET_MANAGEMENT: t("spheres.assetManagement"),
    PURPOSE_OPERATION: t("spheres.purposeOperation"),
    ECONOMIC_OPERATION: t("spheres.economicOperation"),
  };

  const isSurplus = report.totals.netAnnualSurplusCents >= 0;

  const summary = getTreasurerReportSummary(report, t, formatMoney);

  if (slideMode) {
    return (
      <AssemblyReportSlides
        report={report}
        initialLang={lang}
        onClose={() => setSlideMode(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Üst Bar / Sunum Modu Geçişi */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-200 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Presentation className="h-5 w-5 text-accent" aria-hidden="true" />
            {t("title", { year: report.year })}
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ActionButton
            onClick={() => setSlideMode(true)}
            variant="solid"
            size="sm"
            startIcon={<Presentation className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            {t("enterSlideMode")}
          </ActionButton>
          <a
            href={`/api/accounting/extras/treasurer-report?year=${report.year}&lang=${lang}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-ink-200 bg-surface hover:bg-ink-50 text-foreground transition-colors"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            {t("downloadPdf")}
          </a>
        </div>
      </div>

      {/* KPI Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SurfaceCard className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-ink-500">{t("totalIncome")}</span>
          <span className="text-xl font-bold text-foreground mt-2">
            {formatMoney(report.totals.totalIncomeCents)}
          </span>
          <span className="text-[11px] text-ink-500 mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-emerald-600" aria-hidden="true" />
            {t("previousYear")}: {formatMoney(report.totals.totalIncomeCents - (report.totals.yearOnYearDeltaCents > 0 ? report.totals.yearOnYearDeltaCents : 0))}
          </span>
        </SurfaceCard>

        <SurfaceCard className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-ink-500">{t("totalExpense")}</span>
          <span className="text-xl font-bold text-foreground mt-2">
            {formatMoney(report.totals.totalExpenseCents)}
          </span>
          <span className="text-[11px] text-ink-500 mt-1 flex items-center gap-1">
            <TrendingDown className="h-3 w-3 text-rose-600" aria-hidden="true" />
            {t("previousYear")}: {formatMoney(report.totals.totalExpenseCents)}
          </span>
        </SurfaceCard>

        <SurfaceCard className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-ink-500">{t("netSurplus")}</span>
          <span
            className={`text-xl font-bold mt-2 ${
              isSurplus ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatMoney(report.totals.netAnnualSurplusCents)}
          </span>
          <span className="text-[11px] text-ink-500 mt-1">
            {t("yoyDelta")}: {formatMoney(report.totals.yearOnYearDeltaCents)}
          </span>
        </SurfaceCard>

        <SurfaceCard className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-ink-500">{t("closingReserves")}</span>
          <span className="text-xl font-bold text-foreground mt-2">
            {formatMoney(report.reserves.closingReservesCents)}
          </span>
          <span className="text-[11px] text-ink-500 mt-1 flex items-center gap-1">
            <Landmark className="h-3 w-3 text-sky-600" aria-hidden="true" />
            {t("freeReserves")}: {formatMoney(report.reserves.freeReservesCents)}
          </span>
        </SurfaceCard>
      </div>

      {/* Faaliyet Alanları Dağılımı */}
      <SurfaceCard className="p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent" aria-hidden="true" />
          {t("spheresTitle")}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left" role="table">
            <thead>
              <tr className="border-b border-ink-200 font-medium text-ink-500">
                <th className="py-2 px-3">{t("sphereHeader")}</th>
                <th className="py-2 px-3 text-right">{t("incomeHeader")}</th>
                <th className="py-2 px-3 text-right">{t("expenseHeader")}</th>
                <th className="py-2 px-3 text-right">{t("netHeader")}</th>
                <th className="py-2 px-3 text-right">{t("changeHeader")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {report.spheres.map((s) => (
                <tr key={s.sphere} className="hover:bg-ink-50/50">
                  <td className="py-2.5 px-3 font-medium text-foreground">
                    {SPHERE_TITLES[s.sphere] ?? s.sphere}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatMoney(s.incomeCents)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatMoney(s.expenseCents)}</td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono font-medium ${
                      s.netCents >= 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {formatMoney(s.netCents)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-ink-600">
                    {s.yearOnYearChangePercent !== null
                      ? `${s.yearOnYearChangePercent > 0 ? "+" : ""}${s.yearOnYearChangePercent} %`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      {/* Projeler & Düz Metin Özet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {report.projects.length > 0 && (
          <SurfaceCard className="p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t("projectsTitle")}</h3>
            <div className="space-y-2">
              {report.projects.map((p) => (
                <div
                  key={p.projectId}
                  className="flex items-center justify-between py-1.5 border-b border-ink-100 text-xs last:border-0"
                >
                  <span className="font-medium text-foreground">{p.projectName || t("unknownProject")}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-ink-500">
                      {formatMoney(p.incomeCents)} / {formatMoney(p.expenseCents)}
                    </span>
                    <span
                      className={`font-semibold font-mono ${
                        p.netCents >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {formatMoney(p.netCents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
        )}

        <SurfaceCard className={`p-5 ${report.projects.length === 0 ? "lg:col-span-2" : ""}`}>
          <h3 className="text-sm font-semibold text-foreground mb-3">{t("summaryTitle")}</h3>
          <ul className="space-y-2 text-xs text-foreground/90">
            {summary.lines.map((point, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          {summary.recommendation ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-50/50 p-3 text-xs dark:bg-emerald-950/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span className="font-medium text-emerald-900 dark:text-emerald-200">
                {summary.recommendation}
              </span>
            </div>
          ) : null}
        </SurfaceCard>
      </div>
    </div>
  );
}
