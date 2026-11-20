"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Save } from "lucide-react";

import { SUPPORTED_CURRENCIES } from "../services/rates";

export function FinanceSettingsForm() {
  const t = useTranslations("finance.settings");
  const [base, setBase] = useState("EUR");
  const [tracked, setTracked] = useState<string[]>(["USD", "TRY", "CHF", "GBP"]);
  const [saved, setSaved] = useState(false);

  const toggleTracked = (code: string) => {
    setTracked((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
    setSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem("finance:baseCurrency", base);
      localStorage.setItem("finance:trackedCurrencies", JSON.stringify(tracked));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Ignore
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <div className="rounded-3xl bg-white/70 dark:bg-ink-900/60 p-6 shadow-sm border border-ink-100 dark:border-white/10 backdrop-blur-md space-y-6">
        {/* Base Currency Option */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-ink-900 dark:text-white">
            {t("baseCurrencyLabel")}
          </label>
          <p className="text-xs text-ink-500">
            {t("baseCurrencyDesc")}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {(["EUR", "USD", "TRY", "CHF", "GBP"] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                onClick={() => {
                  setBase(curr);
                  setSaved(false);
                }}
                className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                  base === curr
                    ? "bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30"
                    : "bg-ink-100 dark:bg-white/5 text-ink-700 dark:text-ink-300 hover:bg-ink-200"
                }`}
              >
                {curr} ({SUPPORTED_CURRENCIES[curr]?.nameTr})
              </button>
            ))}
          </div>
        </div>

        {/* Tracked Currencies Selection */}
        <div className="space-y-2 pt-4 border-t border-ink-100 dark:border-white/10">
          <label className="text-sm font-bold text-ink-900 dark:text-white">
            {t("trackedCurrenciesLabel")}
          </label>
          <p className="text-xs text-ink-500">
            {t("trackedCurrenciesDesc")}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => {
              const isChecked = tracked.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleTracked(code)}
                  className={`flex items-center justify-between rounded-xl p-2.5 text-xs font-semibold border transition-all ${
                    isChecked
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-300"
                      : "bg-ink-50/50 dark:bg-white/5 border-ink-100 dark:border-white/5 text-ink-600 dark:text-ink-400"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{info.flag}</span>
                    <span>{code}</span>
                  </span>
                  {isChecked && <Check className="size-3.5 text-emerald-600" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-ink-100 dark:border-white/10 flex items-center justify-between">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-bold shadow-md transition-colors focus-visible:outline-2 focus-visible:outline-emerald-500"
          >
            <Save className="size-4" aria-hidden="true" />
            <span>{t("saveButton")}</span>
          </button>

          {saved && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="size-4" aria-hidden="true" />
              <span>{t("savedSuccess")}</span>
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
