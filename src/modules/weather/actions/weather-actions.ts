"use server";

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
  lat: number,
  lon: number,
  cityName?: string,
): Promise<WeatherData | null> {
  if (typeof lat !== "number" || typeof lon !== "number" || isNaN(lat) || isNaN(lon)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  const roundedLat = Number(lat.toFixed(2));
  const roundedLon = Number(lon.toFixed(2));
  const name = cityName?.trim() || "Konumum";

  return await getWeatherData(roundedLat, roundedLon, name);
}

/**
 * Şehir adına göre hazır şehir listesini veya Open-Meteo Geocoding API'sini sunucu üzerinden güvenle sorgular.
 * Bulunan konumun hava durumunu döndürür.
 */
export async function searchCityWeatherAction(
  query: string,
): Promise<{ success: boolean; data: WeatherData | null; error?: string }> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return { success: false, data: null, error: "QUERY_TOO_SHORT" };
  }

  const coords = await searchCityCoordinates(trimmed);
  if (!coords) {
    return { success: false, data: null, error: "CITY_NOT_FOUND" };
  }

  const weather = await getWeatherData(coords.lat, coords.lon, coords.name);
  if (!weather) {
    return { success: false, data: null, error: "WEATHER_UNAVAILABLE" };
  }

  return { success: true, data: weather };
}
