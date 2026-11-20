"use server";

import {
  getExchangeRates,
  SUPPORTED_CURRENCIES,
  DEFAULT_BASE_CURRENCY,
} from "../services/rates";
import type { RatesData } from "../services/rates";

export async function fetchExchangeRatesAction(base?: string): Promise<RatesData> {
  const normalized = typeof base === "string" ? base.trim().toUpperCase() : "";
  const safeBase = Object.prototype.hasOwnProperty.call(SUPPORTED_CURRENCIES, normalized)
    ? SUPPORTED_CURRENCIES[normalized].code
    : DEFAULT_BASE_CURRENCY;

  return await getExchangeRates(safeBase);
}

