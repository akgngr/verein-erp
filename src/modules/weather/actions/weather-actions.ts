"use server";

import { z } from "zod";

import type { ActionResult } from "@/shared/types/action";

import { weatherPermissions } from "../permissions";
import {
  getWeatherData,
  searchCityCoordinates,
  type WeatherData,
} from "../services/weather";

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

/**
 * Tarayıcı geolocation koordinatlarıyla veya harici koordinatlarla hava durumu getirir.
 * Koordinatlar sunucuya ulaştığında doğrudan 2 ondalığa (~1 km) yuvarlanır;
 * kişisel konum bilgisi asla loglanmaz veya veritabanına kaydedilmez.
 */
export async function fetchWeatherByCoordsAction(
  rawInput: unknown,
): Promise<ActionResult<WeatherData | null>> {
  const { createAction } = await import("@/modules/auth/server");
  return createAction({
    permission: { definition: weatherPermissions, action: "view" },
    schema: coordsWeatherSchema,
    handler: async ({ input }) => {
      const roundedLat = Number(input.lat.toFixed(2));
      const roundedLon = Number(input.lon.toFixed(2));
      const name = input.cityName ?? "";

      return await getWeatherData(roundedLat, roundedLon, name);
    },
  })(rawInput);
}

/**
 * Şehir adına göre hazır şehir listesini veya Open-Meteo Geocoding API'sini sunucu üzerinden güvenle sorgular.
 * Bulunan konumun hava durumunu döndürür.
 */
export async function searchCityWeatherAction(
  rawInput: unknown,
): Promise<ActionResult<WeatherData | null>> {
  const { createAction } = await import("@/modules/auth/server");
  return createAction({
    permission: { definition: weatherPermissions, action: "view" },
    schema: citySearchSchema,
    handler: async ({ input }) => {
      const coords = await searchCityCoordinates(input.query);
      if (!coords) {
        return null;
      }

      return await getWeatherData(coords.lat, coords.lon, coords.name);
    },
  })(rawInput);
}
