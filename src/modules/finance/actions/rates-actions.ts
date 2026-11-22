"use server";

import type { ActionResult } from "@/shared/types/action";

import { financePermissions } from "../permissions";
import { fetchRatesSchema } from "../schemas/rates-schemas";
import {
  getExchangeRates,
  SUPPORTED_CURRENCIES,
  DEFAULT_BASE_CURRENCY,
  type RatesData,
} from "../services/rates";

export async function fetchExchangeRatesAction(rawInput?: unknown): Promise<ActionResult<RatesData>> {
  const { createAction } = await import("@/modules/auth/server");
  return createAction({
    permission: { definition: financePermissions, action: "view" },
    schema: fetchRatesSchema,
    handler: async ({ input }) => {
      const safeBase = Object.prototype.hasOwnProperty.call(SUPPORTED_CURRENCIES, input.base)
        ? SUPPORTED_CURRENCIES[input.base].code
        : DEFAULT_BASE_CURRENCY;

      return await getExchangeRates(safeBase);
    },
  })(rawInput ?? {});
}
