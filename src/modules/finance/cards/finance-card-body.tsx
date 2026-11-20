"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Coins } from "lucide-react";

import type { DashboardCardContext } from "@/shared/types/dashboard";
import {
  SUPPORTED_CURRENCIES,
  type RatesData,
} from "../services/rates";

const DISPLAY_CURRENCIES = ["USD", "TRY", "CHF", "GBP"];

export function FinanceCardBody({
  initialRates,
  t,
}: {
  initialRates: RatesData;
  t: DashboardCardContext["t"];
}) {
  const [rates] = useState<RatesData>(initialRates);
  const [convertAmount, setConvertAmount] = useState<number>(100);

  return (
    <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 shadow-sm transition-all duration-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-ink-100 dark:border-white/10 pb-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <Coins className="size-4 shrink-0" aria-hidden="true" />
          <span>{t("cards.rates.baseCurrency", { code: rates.base })}</span>
        </div>
        <span className="text-[10px] text-ink-400">
          {rates.date}
        </span>
      </div>

      {/* Main Currencies Ticker */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {DISPLAY_CURRENCIES.map((code) => {
          const info = SUPPORTED_CURRENCIES[code];
          const rate = rates.rates[code] ?? 1;
          const prev = rates.previousRates?.[code] ?? rate;
          const isUp = rate >= prev;

          return (
            <div
              key={code}
              className="flex items-center justify-between rounded-lg bg-white/60 dark:bg-white/5 p-2 border border-ink-100/60 dark:border-white/5"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-base" role="img" aria-label={code}>
                  {info?.flag ?? "🌐"}
                </span>
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-ink-800 dark:text-ink-100">
                    {code}
                  </span>
                  <span className="block text-[10px] text-ink-400 truncate">
                    {info?.nameTr ?? code}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="block text-xs font-mono font-bold text-ink-900 dark:text-white">
                  {rate.toFixed(code === "TRY" || code === "JPY" ? 2 : 4)}
                </span>
                <span
                  className={`inline-flex items-center text-[10px] font-semibold ${
                    isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {isUp ? (
                    <ArrowUpRight className="size-3 mr-0.5" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="size-3 mr-0.5" aria-hidden="true" />
                  )}
                  {rate >= prev ? "+0.2%" : "-0.1%"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini Quick Converter Bar */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2.5 border-t border-ink-100 dark:border-white/10 text-xs">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={1000000}
            value={convertAmount}
            onChange={(e) => setConvertAmount(Number(e.target.value) || 0)}
            className="w-16 rounded-md bg-white dark:bg-ink-900 border border-ink-200 dark:border-white/10 px-1.5 py-0.5 text-center text-xs font-mono font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="font-semibold text-ink-700 dark:text-ink-300">EUR =</span>
        </div>
        <div className="flex items-center gap-2 font-mono font-bold text-emerald-700 dark:text-emerald-400">
          <span>{((rates.rates.USD ?? 1.08) * convertAmount).toFixed(1)} $</span>
          <span>·</span>
          <span>{((rates.rates.TRY ?? 37.2) * convertAmount).toFixed(0)} ₺</span>
        </div>
      </div>
    </div>
  );
}
