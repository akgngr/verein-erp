"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, RefreshCw, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { fetchExchangeRatesAction } from "../actions/rates-actions";
import type { RatesData } from "../services/rates";

const codes = ["USD", "TRY", "CHF", "GBP"] as const;

/** No independent polling: a single permission-checked action on mount, manual refresh thereafter. */
export default function FinanceRatesHeaderWidget() {
  const locale = useLocale();
  const translate = useTranslations("finance.widget");
  const [rates, setRates] = useState<RatesData | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(async (active: () => boolean) => {
    try {
      const result = await fetchExchangeRatesAction({ base: "EUR" });
      if (!active()) return;
      if (!result.ok || !result.data) {
        setError(true);
      } else {
        setRates(result.data);
        setError(false);
      }
    } catch {
      if (active()) setError(true);
    } finally {
      if (active()) setBusy(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void refresh(() => mounted);
    return () => { mounted = false; };
  }, [refresh]);

  const number = new Intl.NumberFormat(locale === "de" ? "de-DE" : "tr-TR", { maximumFractionDigits: 4, minimumFractionDigits: 2 });
  return (
    <div className="relative">
      <button type="button" aria-label={translate("title")} aria-expanded={expanded} onClick={() => setExpanded((x) => !x)}
        className="group inline-flex h-9 items-center gap-2 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-teal-500/5 px-3 text-xs font-semibold text-ink-800 transition-colors duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 dark:text-ink-100">
        <TrendingUp className="size-4 text-emerald-600 transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5 dark:text-emerald-400" aria-hidden="true" />
        <span>{rates && Number.isFinite(rates.rates.USD) ? `EUR/USD ${number.format(rates.rates.USD)}` : translate("title")}</span>
        {busy && <RefreshCw className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      </button>
      {expanded && (
        <section aria-label={translate("title")} className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[90vw] rounded-2xl border border-emerald-500/20 bg-surface p-4 text-ink-900 shadow-xl dark:text-ink-100">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold"><ArrowRightLeft className="size-4 text-emerald-500" aria-hidden="true" />{translate("title")}</div>
            <button type="button" disabled={busy} onClick={() => { setBusy(true); void refresh(() => true); }} aria-label={translate("refresh")} title={translate("refresh")}
              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-emerald-500/10 focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:opacity-50">
              <RefreshCw className={`size-4 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            </button>
          </div>
          <p className="mb-2 text-[11px] text-ink-500">{translate("base")}{rates ? ` · ${rates.date}` : ""}</p>
          {rates && <div className="space-y-1.5">
            {codes.map((code) => (
              <div key={code} className="flex items-center justify-between rounded-lg bg-emerald-500/5 px-3 py-2 text-sm">
                <span className="font-medium">{code}</span>
                <span className="font-mono tabular-nums font-semibold">{Number.isFinite(rates.rates[code]) ? number.format(rates.rates[code]) : "—"}</span>
              </div>
            ))}
          </div>}
          {!rates && <p role="status" className="py-3 text-xs text-ink-500">{busy ? "…" : translate("unavailable")}</p>}
          {error && <p role="status" className="mt-2 text-xs text-amber-600">{translate("unavailable")}</p>}
          <Link href="/finance" className="mt-3 block text-right text-xs font-semibold text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400">{translate("more")}</Link>
        </section>
      )}
    </div>
  );
}
