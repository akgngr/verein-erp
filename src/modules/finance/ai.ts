import "server-only";

import { z } from "zod";
import { defineModuleAiV2, aiToolV2 } from "@/shared/ai/v2";
import { can } from "@/shared/permissions/define";
import { financePermissions } from "./permissions";
import { getExchangeRates, DEFAULT_BASE_CURRENCY } from "./services/rates";

const RatesOutputSchema = z
  .object({
    base: z.string(),
    date: z.string(),
    rates: z.record(z.string(), z.number()),
  })
  .strict();

export const aiRatesTool = aiToolV2({
  name: "get_exchange_rates",
  operation: "read",
  allowed: (user) => can(user.role, financePermissions, "view"),
  description:
    "Get current foreign exchange rates for donations, budget calculations, and financial planning.", // i18n-ignore (model-facing tool text)
  input: z
    .object({
      baseCurrency: z.string().optional(),
      targetCurrencies: z.array(z.string()).optional(),
    })
    .strict(),
  result: RatesOutputSchema,
  modelOutput: RatesOutputSchema,
  policy: {
    purpose: "currency-rates",
    serverReads: [],
    modelFields: ["base", "date", "rates"],
    processing: "approved_provider",
    modelDataClass: "aggregate",
  },
  projectForModel: (result) => result,
  run: async (input) => {
    const base = input.baseCurrency ?? DEFAULT_BASE_CURRENCY;
    const data = await getExchangeRates(base);

    let rates = data.rates;
    if (input.targetCurrencies && input.targetCurrencies.length > 0) {
      const filtered: Record<string, number> = {};
      for (const curr of input.targetCurrencies) {
        const key = curr.toUpperCase();
        if (rates[key] !== undefined) {
          filtered[key] = rates[key];
        }
      }
      rates = filtered;
    }

    return {
      base: data.base,
      date: data.date,
      rates,
    };
  },
});

export const ai = defineModuleAiV2({
  module: "finance",
  tools: [aiRatesTool],
  actions: {},
});
