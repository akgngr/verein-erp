import { z } from "zod";

export const coordsWeatherSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    cityName: z.string().trim().max(80).optional(),
  })
  .strict();

export const citySearchSchema = z
  .object({
    query: z.string().trim().min(2).max(80),
  })
  .strict();
