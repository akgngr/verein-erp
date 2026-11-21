"use server";

import { z } from "zod";

import type { ActionResult } from "@/shared/types/action";

import { financePermissions } from "../permissions";
import {
  getExchangeRates,
  SUPPORTED_CURRENCIES,
  DEFAULT_BASE_CURRENCY,
  type RatesData,
} from "../services/rates";

export const fetchRatesSchema = z
  .object({
    base: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/)
      .transform((val) => val.toUpperCase())
      .default(DEFAULT_BASE_CURRENCY),
  })
  .default({ base: DEFAULT_BASE_CURRENCY });

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
