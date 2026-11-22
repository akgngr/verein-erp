import { z } from "zod";

import { DEFAULT_BASE_CURRENCY } from "../services/rates";

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
