"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/shared/components/kit";
import { getMonthlyEgressReportAction } from "../actions/egress-actions";
import type { MonthlyEgressReport } from "../services/egress-report-core";

type Props = { idPrefix?: string; initialYear: number; initialMonth: number };

export function EgressReportPanel({
  idPrefix = "system-egress-report",
  initialYear,
  initialMonth,
}: Props) {
  const t = useTranslations("system.egressUi");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [report, setReport] = useState<MonthlyEgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const requestId = useRef(0);

  function refresh(selectedYear: number, selectedMonth: number) {
    const seq = ++requestId.current;
    setLoading(true);
    setError(false);
    // Never display an old period as if it belonged to a newly selected month.
    setReport(null);
    void getMonthlyEgressReportAction({ year: selectedYear, month: selectedMonth })
      .then((result) => {
        if (requestId.current !== seq) return;
        if (result.ok) setReport(result.data);
        else setError(true);
      })
      .catch(() => { if (requestId.current === seq) setError(true); })
      .finally(() => { if (requestId.current === seq) setLoading(false); });
  }

  useEffect(() => {
    // Initial month/year originates from the server: no Date/Math.random during hydration.
    const seq = ++requestId.current;
    let mounted = true;
    void getMonthlyEgressReportAction({ year: initialYear, month: initialMonth })
      .then((result) => {
        if (!mounted || requestId.current !== seq) return;
        if (result.ok) setReport(result.data);
        else setError(true);
      })
      .catch(() => { if (mounted && requestId.current === seq) setError(true); })
      .finally(() => { if (mounted && requestId.current === seq) setLoading(false); });
    return () => { mounted = false; };
  }, [initialYear, initialMonth]);

  return (
    <section aria-label={t("title")} className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
        <label htmlFor={`${idPrefix}-month`} className="flex flex-col gap-1 text-sm font-medium">
          {t("month")}
          <select
            id={`${idPrefix}-month`} value={month}
            onChange={(event) => { const value = Number(event.target.value); setMonth(value); refresh(year, value); }}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>{String(index + 1).padStart(2, "0")}</option>
            ))}
          </select>
        </label>
        <label htmlFor={`${idPrefix}-year`} className="flex flex-col gap-1 text-sm font-medium">
          {t("year")}
          <input
            id={`${idPrefix}-year`} type="number" min={2020} max={2100} step={1}
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-foreground"
          />
        </label>
        <Button onPress={() => refresh(year, month)} isDisabled={loading || !Number.isInteger(year) || year < 2020 || year > 2100}>
          {t("refresh")}
        </Button>
      </div>
      {loading && <p role="status" className="text-sm text-secondary">{t("loading")}</p>}
      {error && <p role="alert" className="text-sm text-danger">{t("error")}</p>}
      {report && !loading && (
        <>
          <section aria-labelledby={`${idPrefix}-configuration`} className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-3">
            <h2 id={`${idPrefix}-configuration`} className="text-lg font-semibold">{t("configuration")}</h2>
            <p className="text-sm text-secondary">{t("configurationNote")}</p>
            <p className="text-sm">{t("activePreset")}: {report.configuration.activePreset ?? t("none")}</p>
            <p className="text-sm">{t("aiProviders")}: {report.configuration.ai.configuredProviders.join(", ") || t("none")}</p>
            <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm">
              <thead><tr className="border-b border-border"><th className="p-2">{t("module")}</th><th className="p-2">{t("state")}</th><th className="p-2">{t("providers")}</th></tr></thead>
              <tbody>{report.configuration.modules.map((item) => <tr key={item.moduleKey} className="border-b border-border">
                <th scope="row" className="p-2">{item.moduleKey}</th>
                <td className="p-2">{t(item.isEnabled ? "enabled" : "disabled")}</td>
                <td className="p-2">{item.providers.join(", ")}</td>
              </tr>)}</tbody>
            </table></div>
          </section>

          <section aria-labelledby={`${idPrefix}-actual`} className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-3">
            <h2 id={`${idPrefix}-actual`} className="text-lg font-semibold">{t("actualTransfers")}</h2>
            <p className="text-sm text-secondary">{t("period")}: {report.actualTransfers.period.year}-{String(report.actualTransfers.period.month).padStart(2, "0")}</p>
            <p className="text-sm font-medium">{t("totalCalls")}: {report.actualTransfers.totalCalls} · {t("totalVolume")}: {report.actualTransfers.totalVolume}</p>
            <p className="text-sm text-secondary">{t("immutableNotice")}</p>
            {report.actualTransfers.entries.length === 0
              ? <p className="text-sm text-secondary">{t("noTransfers")}</p>
              : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm">
                <thead><tr className="border-b border-border">
                  <th className="p-2">{t("module")}</th><th className="p-2">{t("provider")}</th><th className="p-2">{t("category")}</th>
                  <th className="p-2">{t("calls")}</th><th className="p-2">{t("volume")}</th><th className="p-2">{t("legalBasis")}</th>
                </tr></thead>
                <tbody>{report.actualTransfers.entries.map((item) => (
                  <tr key={`${item.moduleKey}-${item.category}-${item.provider}-${item.legalBasis}-${item.unit}`} className="border-b border-border">
                    <th scope="row" className="p-2">{item.moduleKey}</th><td className="p-2">{item.provider}</td>
                    <td className="p-2">{item.category}</td><td className="p-2">{item.callCount}</td>
                    <td className="p-2">{item.totalVolume} {item.unit}</td><td className="p-2">{item.legalBasis}</td>
                  </tr>
                ))}</tbody>
              </table></div>}
          </section>

          <section aria-labelledby={`${idPrefix}-retention`} className="rounded-xl border border-border bg-surface p-4 sm:p-6 space-y-3">
            <h2 id={`${idPrefix}-retention`} className="text-lg font-semibold">{t("providerRetention")}</h2>
            <p className="text-sm text-secondary">{t("retentionNotice")}</p>
            <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
              <thead><tr className="border-b border-border"><th className="p-2">{t("provider")}</th>
                <th className="p-2">{t("jurisdiction")}</th><th className="p-2">{t("policy")}</th>
                <th className="p-2">{t("days")}</th><th className="p-2">{t("occurred")}</th></tr></thead>
              <tbody>{report.providerRetention.map((item) => (
                <tr key={`${item.provider}-${item.category}`} className="border-b border-border">
                  <th scope="row" className="p-2">{item.provider}</th><td className="p-2">{item.jurisdiction}</td>
                  <td className="p-2">{item.policyType}</td>
                  <td className="p-2">{item.retentionDays ?? t("unknown")}</td>
                  <td className="p-2">{t(item.hadTransfersInPeriod ? "yes" : "no")}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </section>
        </>
      )}
    </section>
  );
}
