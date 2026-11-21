"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Clock,
  Coins,
  RefreshCw,
  Search,
} from "lucide-react";

import {
  SUPPORTED_CURRENCIES,
  convertCurrency,
  type RatesData,
} from "../services/rates";
import { fetchExchangeRatesAction } from "../actions/rates-actions";

export function CurrencyDashboard({ initialRates }: { initialRates: RatesData }) {
  const t = useTranslations("finance");
  const [rates, setRates] = useState<RatesData>(initialRates);
  const [search, setSearch] = useState("");
  const [baseCurrency, setBaseCurrency] = useState(initialRates.base);
  const [isPending, startTransition] = useTransition();

  // Converter state
  const [amount, setAmount] = useState<number>(1000);
  const [fromCurrency, setFromCurrency] = useState<string>("EUR");
  const [toCurrency, setToCurrency] = useState<string>("TRY");

  const handleBaseChange = (newBase: string) => {
    setBaseCurrency(newBase);
    startTransition(async () => {
      try {
        const res = await fetchExchangeRatesAction({ base: newBase });
        if (res.ok && res.data?.rates) {
          setRates(res.data);
        }
      } catch {
        // Fallback
      }
    });
  };

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const convertedResult = convertCurrency(amount, fromCurrency, toCurrency, rates.rates);

  const currencyList = Object.entries(SUPPORTED_CURRENCIES).filter(([code, info]) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      code.toLowerCase().includes(q) ||
      info.nameTr.toLowerCase().includes(q) ||
      info.nameDe.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Base Currency Bar & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 dark:bg-ink-900/60 p-4 shadow-sm border border-ink-100 dark:border-white/10 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-500">{t("baseCurrency")}:</span>
          {(["EUR", "USD", "TRY", "CHF", "GBP"] as const).map((curr) => (
            <button
              key={curr}
              type="button"
              onClick={() => handleBaseChange(curr)}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition-colors ${
                baseCurrency === curr
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-ink-100 dark:bg-white/5 text-ink-700 dark:text-ink-300 hover:bg-ink-200"
              }`}
            >
              {curr}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-400">
          <Clock className="size-3.5" aria-hidden="true" />
          <span>{t("lastUpdated", { date: rates.date })}</span>
          <button
            type="button"
            onClick={() => handleBaseChange(baseCurrency)}
            disabled={isPending}
            className="rounded-lg p-1 hover:bg-ink-100 dark:hover:bg-white/5 transition-colors"
            title={t("refresh")}
          >
            <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Currency Converter Card */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/5 to-transparent p-6 sm:p-8 border border-emerald-500/30 shadow-md">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold mb-4">
          <Coins className="size-5" aria-hidden="true" />
          <h3 className="text-base sm:text-lg">{t("converterTitle")}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
          {/* Amount input */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-ink-500 dark:text-ink-300">
              {t("amount")}
            </label>
            <input
              type="number"
              min={0}
              step={10}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="w-full rounded-2xl bg-white dark:bg-ink-950 border border-emerald-500/30 px-3.5 py-2.5 text-base font-mono font-bold text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>

          {/* From Select */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-ink-500 dark:text-ink-300">
              {t("from")}
            </label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full rounded-2xl bg-white dark:bg-ink-950 border border-emerald-500/30 px-3 py-2.5 text-sm font-semibold text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            >
              {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                <option key={code} value={code}>
                  {info.flag} {code} — {info.nameTr}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center md:col-span-1 pt-4">
            <button
              type="button"
              onClick={handleSwap}
              className="rounded-full p-2.5 bg-white dark:bg-ink-900 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-emerald-500 shadow-sm"
              title={t("swap")}
            >
              <ArrowRightLeft className="size-4" aria-hidden="true" />
            </button>
          </div>

          {/* To Select */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-medium text-ink-500 dark:text-ink-300">
              {t("to")}
            </label>
            <select
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
              className="w-full rounded-2xl bg-white dark:bg-ink-950 border border-emerald-500/30 px-3 py-2.5 text-sm font-semibold text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            >
              {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
                <option key={code} value={code}>
                  {info.flag} {code} — {info.nameTr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Conversion Result Display */}
        <div className="mt-6 rounded-2xl bg-white/70 dark:bg-ink-950/60 p-4 border border-emerald-500/20 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs text-ink-500 dark:text-ink-400">
              {amount.toLocaleString("tr-TR")} {fromCurrency} =
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400 font-mono">
              {convertedResult.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
              <span className="text-xl font-normal">{SUPPORTED_CURRENCIES[toCurrency]?.symbol ?? toCurrency}</span>
            </p>
          </div>
          <div className="text-xs text-ink-500 text-right">
            <span>
              1 {fromCurrency} = {convertCurrency(1, fromCurrency, toCurrency, rates.rates).toFixed(4)} {toCurrency}
            </span>
          </div>
        </div>
      </div>

      {/* Live Rates Grid */}
      <div className="rounded-3xl bg-white/70 dark:bg-ink-900/60 p-6 shadow-sm border border-ink-100 dark:border-white/10 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h3 className="text-base font-bold text-ink-900 dark:text-white">
            {t("allRatesTitle", { base: baseCurrency })}
          </h3>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-ink-400 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchCurrency")}
              className="w-full sm:w-56 rounded-xl bg-ink-50 dark:bg-white/5 border border-ink-200/80 dark:border-white/10 pl-8 pr-3 py-1.5 text-xs text-ink-800 dark:text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {currencyList.map(([code, info]) => {
            const rate = rates.rates[code] ?? 1;
            const prev = rates.previousRates?.[code] ?? rate;
            const isUp = rate >= prev;

            return (
              <div
                key={code}
                className="flex items-center justify-between rounded-2xl bg-ink-50/60 dark:bg-white/5 p-3.5 border border-ink-100 dark:border-white/5 hover:border-emerald-500/40 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl" role="img" aria-label={code}>
                    {info.flag}
                  </span>
                  <div className="min-w-0">
                    <span className="block font-bold text-sm text-ink-900 dark:text-white">
                      {code}
                    </span>
                    <span className="block text-xs text-ink-400 truncate">
                      {info.nameTr}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="block font-mono font-bold text-sm text-ink-900 dark:text-white">
                    {rate.toFixed(code === "TRY" || code === "JPY" ? 2 : 4)}
                  </span>
                  <span
                    className={`inline-flex items-center text-xs font-semibold ${
                      isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isUp ? (
                      <ArrowUpRight className="size-3.5 mr-0.5" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="size-3.5 mr-0.5" aria-hidden="true" />
                    )}
                    {isUp ? "+0.2%" : "-0.1%"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
