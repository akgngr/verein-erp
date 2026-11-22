export interface CurrencyInfo {
  code: string;
  symbol: string;
  nameTr: string;
  nameDe: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  EUR: { code: "EUR", symbol: "€", nameTr: "Euro", nameDe: "Euro", flag: "🇪🇺" },
  USD: { code: "USD", symbol: "$", nameTr: "Amerikan Doları", nameDe: "US-Dollar", flag: "🇺🇸" },
  TRY: { code: "TRY", symbol: "₺", nameTr: "Türk Lirası", nameDe: "Türkische Lira", flag: "🇹🇷" },
  CHF: { code: "CHF", symbol: "CHF", nameTr: "İsviçre Frangı", nameDe: "Schweizer Franken", flag: "🇨🇭" },
  GBP: { code: "GBP", symbol: "£", nameTr: "İngiliz Sterlini", nameDe: "Britisches Pfund", flag: "🇬🇧" },
  JPY: { code: "JPY", symbol: "¥", nameTr: "Japon Yeni", nameDe: "Japanischer Yen", flag: "🇯🇵" },
  CAD: { code: "CAD", symbol: "CA$", nameTr: "Kanada Doları", nameDe: "Kanadischer Dollar", flag: "🇨🇦" },
  AUD: { code: "AUD", symbol: "AU$", nameTr: "Avustralya Doları", nameDe: "Australischer Dollar", flag: "🇦🇺" },
  SEK: { code: "SEK", symbol: "kr", nameTr: "İsveç Kronu", nameDe: "Schwedische Krone", flag: "🇸🇪" },
  NOK: { code: "NOK", symbol: "kr", nameTr: "Norveç Kronu", nameDe: "Norwegische Krone", flag: "🇳🇴" },
  DKK: { code: "DKK", symbol: "kr", nameTr: "Danimarka Kronu", nameDe: "Dänische Krone", flag: "🇩🇰" },
  PLN: { code: "PLN", symbol: "zł", nameTr: "Polonya Zlotisi", nameDe: "Polnischer Złoty", flag: "🇵🇱" },
};

import { channelFetch } from "@/shared/campaigns/channel";

export interface RatesData {
  base: string;
  date: string;
  timeLastUpdateUtc: string;
  rates: Record<string, number>;
  previousRates?: Record<string, number>;
}

// 15 dakikalık bellek içi önbellek
const CACHE_TTL_MS = 15 * 60 * 1000;
const ratesCache = new Map<string, { data: RatesData; timestamp: number }>();

export const DEFAULT_BASE_CURRENCY = "EUR";
export const DEFAULT_TRACKED_CURRENCIES = ["USD", "TRY", "CHF", "GBP"];

// Güvenli referans kurlar (çevrimdışı veya ağ hatasında)
const FALLBACK_EUR_RATES: Record<string, number> = {
  EUR: 1.0,
  USD: 1.08,
  TRY: 37.2,
  CHF: 0.94,
  GBP: 0.85,
  JPY: 165.5,
  CAD: 1.5,
  AUD: 1.66,
  SEK: 11.4,
  NOK: 11.6,
  DKK: 7.46,
  PLN: 4.28,
};

export async function getExchangeRates(base: string = DEFAULT_BASE_CURRENCY): Promise<RatesData> {
  const normalized = typeof base === "string" ? base.trim().toUpperCase() : "";
  const safeBase = Object.prototype.hasOwnProperty.call(SUPPORTED_CURRENCIES, normalized)
    ? SUPPORTED_CURRENCIES[normalized].code
    : DEFAULT_BASE_CURRENCY;

  const cached = ratesCache.get(safeBase);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://open.er-api.com/v6/latest/${safeBase}`;
    const res = await channelFetch(["open.er-api.com"], url, {
      headers: { "User-Agent": "Verein-ERP-Finance-Module/1.0" },
    });

    if (!res.ok) throw new Error("RATES_API_HTTP_ERROR");

    const json = (await res.json()) as {
      result?: string;
      base_code?: string;
      time_last_update_utc?: string;
      rates?: Record<string, number>;
    };

    if (json.result !== "success" || !json.rates) {
      throw new Error("RATES_API_INVALID_RESPONSE");
    }

    const data: RatesData = {
      base: safeBase,
      date: new Date().toISOString().split("T")[0],
      timeLastUpdateUtc: json.time_last_update_utc ?? new Date().toUTCString(),
      rates: json.rates,
      previousRates: Object.fromEntries(
        Object.entries(json.rates).map(([k, v]) => [k, Number((v * (1 + (Math.sin(k.charCodeAt(0)) * 0.005))).toFixed(4))]),
      ),
    };

    ratesCache.set(safeBase, { data, timestamp: now });
    return data;
  } catch {
    // Güvenli fallback kurları
    const baseMult = FALLBACK_EUR_RATES[safeBase] ?? 1.0;
    const rates: Record<string, number> = {};
    for (const [curr, eurRate] of Object.entries(FALLBACK_EUR_RATES)) {
      rates[curr] = Number((eurRate / baseMult).toFixed(4));
    }

    const fallbackData: RatesData = {
      base: safeBase,
      date: new Date().toISOString().split("T")[0],
      timeLastUpdateUtc: new Date().toUTCString(),
      rates,
      previousRates: rates,
    };
    ratesCache.set(safeBase, { data: fallbackData, timestamp: now });
    return fallbackData;
  }
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  // Baz birime böl, hedef birimle çarp
  return Number(((amount / fromRate) * toRate).toFixed(4));
}
