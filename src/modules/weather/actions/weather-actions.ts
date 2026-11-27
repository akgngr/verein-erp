"use server";

import type { ActionResult } from "@/shared/types/action";

import { weatherPermissions } from "../permissions";
import {
  coordsWeatherSchema,
  citySearchSchema,
} from "../schemas/weather-schemas";
import {
  getWeatherData,
  searchCityCoordinates,
  type WeatherData,
} from "../services/weather";

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

/** #585: Derneğin şehri için hava durumu (başlık widget'ı; önceden sabit Frankfurt). */
export async function fetchOrganizationWeatherAction(): Promise<ActionResult<WeatherData | null>> {
  const { createAction } = await import("@/modules/auth/server");
  const { z } = await import("zod");
  return createAction({
    permission: { definition: weatherPermissions, action: "view" },
    schema: z.object({}).strict(),
    handler: async () => {
      const { getOrganizationWeather } = await import("../services/weather");
      return getOrganizationWeather();
    },
  })({});
}
