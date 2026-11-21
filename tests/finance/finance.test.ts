import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  SUPPORTED_CURRENCIES,
  DEFAULT_BASE_CURRENCY,
  convertCurrency,
} from "@/modules/finance";
import { getExchangeRates } from "@/modules/finance/server";
import { fetchRatesSchema } from "@/modules/finance/actions/rates-actions";
import { aiRatesTool } from "@/modules/finance/ai";

describe("Finance module tests", () => {
  it("SUPPORTED_CURRENCIES contains key currencies with symbols and flags", () => {
    assert.ok(SUPPORTED_CURRENCIES.EUR);
    assert.equal(SUPPORTED_CURRENCIES.EUR.symbol, "€");
    assert.ok(SUPPORTED_CURRENCIES.USD);
    assert.equal(SUPPORTED_CURRENCIES.USD.symbol, "$");
    assert.ok(SUPPORTED_CURRENCIES.TRY);
    assert.equal(SUPPORTED_CURRENCIES.TRY.symbol, "₺");
    assert.ok(SUPPORTED_CURRENCIES.CHF);
    assert.ok(SUPPORTED_CURRENCIES.GBP);
  });

  it("convertCurrency computes correct proportional conversions", () => {
    const mockRates = {
      EUR: 1.0,
      USD: 1.1,
      TRY: 38.5,
    };

    // 100 EUR to USD -> 110 USD
    const toUsd = convertCurrency(100, "EUR", "USD", mockRates);
    assert.equal(toUsd, 110);

    // 100 USD to EUR -> ~90.9091 EUR
    const toEur = convertCurrency(110, "USD", "EUR", mockRates);
    assert.equal(toEur, 100);

    // Same currency -> amount unchanged
    const same = convertCurrency(500, "TRY", "TRY", mockRates);
    assert.equal(same, 500);
  });

  it("getExchangeRates returns valid RatesData with base and rates", async () => {
    const data = await getExchangeRates(DEFAULT_BASE_CURRENCY);
    assert.equal(data.base, "EUR");
    assert.ok(data.rates);
    assert.equal(typeof data.rates.USD, "number");
    assert.equal(typeof data.rates.TRY, "number");
    assert.ok(data.date);
  });

  it("getExchangeRates sanitizes invalid or path traversal base to DEFAULT_BASE_CURRENCY", async () => {
    const dataWithTraversal = await getExchangeRates("../../evil");
    assert.equal(dataWithTraversal.base, "EUR");

    const dataWithUnknown = await getExchangeRates("UNKNOWN");
    assert.equal(dataWithUnknown.base, "EUR");
  });

  it("fetchRatesSchema strictly validates 3-letter currency code and rejects traversal", () => {
    const valid = fetchRatesSchema.safeParse({ base: "USD" });
    assert.equal(valid.success, true);
    if (valid.success) assert.equal(valid.data.base, "USD");

    const lowercase = fetchRatesSchema.safeParse({ base: "try" });
    assert.equal(lowercase.success, true);
    if (lowercase.success) assert.equal(lowercase.data.base, "TRY");

    const defaultVal = fetchRatesSchema.safeParse({});
    assert.equal(defaultVal.success, true);
    if (defaultVal.success) assert.equal(defaultVal.data.base, "EUR");

    const traversal = fetchRatesSchema.safeParse({ base: "../evil" });
    assert.equal(traversal.success, false);

    const tooLong = fetchRatesSchema.safeParse({ base: "USDOLLAR" });
    assert.equal(tooLong.success, false);
  });

  it("aiRatesTool is properly configured with v2 AI contract", () => {
    assert.equal(aiRatesTool.name, "get_exchange_rates");
    assert.equal(aiRatesTool.operation, "read");
    assert.equal(aiRatesTool.policy.purpose, "currency-rates");
  });
});
