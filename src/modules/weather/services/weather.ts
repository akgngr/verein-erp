import { channelFetch } from "@/shared/campaigns/channel";

export interface WeatherData {
  city: string;
  latitude: number;
  longitude: number;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  conditionTextTr: string;
  conditionTextDe: string;
  isDay: boolean;
  precipitation: number;
  daily: {
    dates: string[];
    maxTemps: number[];
    minTemps: number[];
    weatherCodes: number[];
    precipitationSums: number[];
  };
  hourly: {
    times: string[];
    temps: number[];
    weatherCodes: number[];
  };
  updatedAt: string;
}

export interface WeatherConditionInfo {
  code: number;
  tr: string;
  de: string;
  icon: "sun" | "cloud-sun" | "cloud" | "fog" | "rain" | "snow" | "thunder";
  isAdverse: boolean; // yağmur, fırtına, yoğun kar vb.
}

export const WMO_CODES: Record<number, WeatherConditionInfo> = {
  0: { code: 0, tr: "Açık ve Güneşli", de: "Klar und sonnig", icon: "sun", isAdverse: false },
  1: { code: 1, tr: "Çoğunlukla Açık", de: "Überwiegend klar", icon: "cloud-sun", isAdverse: false },
  2: { code: 2, tr: "Parçalı Bulutlu", de: "Teilweise bewölkt", icon: "cloud-sun", isAdverse: false },
  3: { code: 3, tr: "Bulutlu", de: "Bedeckt", icon: "cloud", isAdverse: false },
  45: { code: 45, tr: "Sisli", de: "Nebel", icon: "fog", isAdverse: false },
  48: { code: 48, tr: "Kırağılı Sis", de: "Raureifnebel", icon: "fog", isAdverse: false },
  51: { code: 51, tr: "Hafif Çisenti", de: "Leichter Nieselregen", icon: "rain", isAdverse: true },
  53: { code: 53, tr: "Çisenti", de: "Mäßiger Nieselregen", icon: "rain", isAdverse: true },
  55: { code: 55, tr: "Yoğun Çisenti", de: "Dichter Nieselregen", icon: "rain", isAdverse: true },
  61: { code: 61, tr: "Hafif Yağmurlu", de: "Leichter Regen", icon: "rain", isAdverse: true },
  63: { code: 63, tr: "Yağmurlu", de: "Mäßiger Regen", icon: "rain", isAdverse: true },
  65: { code: 65, tr: "Kuvvetli Yağmur", de: "Starker Regen", icon: "rain", isAdverse: true },
  71: { code: 71, tr: "Hafif Kar Yağışlı", de: "Leichter Schneefall", icon: "snow", isAdverse: true },
  73: { code: 73, tr: "Kar Yağışlı", de: "Mäßiger Schneefall", icon: "snow", isAdverse: true },
  75: { code: 75, tr: "Yoğun Kar Yağışlı", de: "Starker Schneefall", icon: "snow", isAdverse: true },
  77: { code: 77, tr: "Kar Taneleri", de: "Schneegriesel", icon: "snow", isAdverse: true },
  80: { code: 80, tr: "Hafif Sağanak", de: "Leichter Regenschauer", icon: "rain", isAdverse: true },
  81: { code: 81, tr: "Sağanak Yağış", de: "Mäßiger Regenschauer", icon: "rain", isAdverse: true },
  82: { code: 82, tr: "Şiddetli Sağanak", de: "Heftiger Regenschauer", icon: "rain", isAdverse: true },
  85: { code: 85, tr: "Kar Sağanağı", de: "Schneeschauer", icon: "snow", isAdverse: true },
  86: { code: 86, tr: "Yoğun Kar Sağanağı", de: "Starker Schneeschauer", icon: "snow", isAdverse: true },
  95: { code: 95, tr: "Gök Gürültülü Fırtına", de: "Gewitter", icon: "thunder", isAdverse: true },
  96: { code: 96, tr: "Dolu ile Birlikte Fırtına", de: "Gewitter mit leichtem Hagel", icon: "thunder", isAdverse: true },
  99: { code: 99, tr: "Şiddetli Dolu ve Fırtına", de: "Gewitter mit starkem Hagel", icon: "thunder", isAdverse: true },
};

export function getConditionInfo(code: number): WeatherConditionInfo {
  return (
    WMO_CODES[code] ?? {
      code,
      tr: "Değişken Hava",
      de: "Wechselhaft",
      icon: "cloud",
      isAdverse: false,
    }
  );
}

// 15 dakikalık bellek içi önbellek (cache)
const CACHE_TTL_MS = 15 * 60 * 1000;
interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}
const weatherCache = new Map<string, CacheEntry>();

/**
 * #585: Önbellekler sınırlıdır (kullanıcı şehir aramasıyla sınırsız büyüyemez). Map ekleme sırasını korur;
 * sınır aşılınca en eski kayıt atılır.
 */
export const WEATHER_CACHE_LIMIT = 200;
export function boundedSet<K, V>(map: Map<K, V>, key: K, value: V, limit = WEATHER_CACHE_LIMIT): void {
  map.delete(key);
  map.set(key, value);
  while (map.size > limit) {
    const oldest = map.keys().next().value as K;
    map.delete(oldest);
  }
}

export function setCachedWeatherData(data: WeatherData): void {
  const roundedLat = Number(data.latitude.toFixed(2));
  const roundedLon = Number(data.longitude.toFixed(2));
  boundedSet(weatherCache, `${roundedLat},${roundedLon}`, { data, timestamp: Date.now() });
}

export function clearWeatherCache(): void {
  weatherCache.clear();
}

export const PRESET_CITIES = [
  { name: "Frankfurt am Main", lat: 50.11, lon: 8.68 },
  { name: "Berlin", lat: 52.52, lon: 13.41 },
  { name: "Köln", lat: 50.94, lon: 6.96 },
  { name: "München", lat: 48.14, lon: 11.58 },
  { name: "Hamburg", lat: 53.55, lon: 9.99 },
  { name: "Stuttgart", lat: 48.78, lon: 9.18 },
  { name: "Düsseldorf", lat: 51.22, lon: 6.78 },
  { name: "Dortmund", lat: 51.51, lon: 7.47 },
  { name: "Essen", lat: 51.46, lon: 7.01 },
  { name: "Leipzig", lat: 51.34, lon: 12.37 },
  { name: "Bremen", lat: 53.08, lon: 8.81 },
  { name: "Dresden", lat: 51.05, lon: 13.74 },
  { name: "Hannover", lat: 52.37, lon: 9.73 },
  { name: "Nürnberg", lat: 49.45, lon: 11.08 },
  { name: "Wien", lat: 48.21, lon: 16.37 },
  { name: "Zürich", lat: 47.38, lon: 8.54 },
  { name: "İstanbul", lat: 41.01, lon: 28.98 },
  { name: "Ankara", lat: 39.93, lon: 32.86 },
] as const;

export function findCityCoordinates(cityName?: string | null): { name: string; lat: number; lon: number } | null {
  if (!cityName) return null;
  const normalized = cityName.trim().toLowerCase();
  if (normalized.length < 2) return null;

  // 1. Tam ad eşleşmesi
  const exact = PRESET_CITIES.find((c) => c.name.toLowerCase() === normalized);
  if (exact) return exact;

  // 2. En az 3 karakterli başlangıç (prefix) eşleşmesi (çift yönlü includes yanlış eşleşmeleri önler)
  if (normalized.length >= 3) {
    const prefix = PRESET_CITIES.find((c) => c.name.toLowerCase().startsWith(normalized));
    if (prefix) return prefix;
  }

  return null;
}

export async function searchCityCoordinates(
  cityName?: string | null,
): Promise<{ name: string; lat: number; lon: number } | null> {
  if (!cityName) return null;
  const trimmed = cityName.trim();
  if (trimmed.length < 2) return null;

  // Önce hazır şehir listesinde ara
  const preset = findCityCoordinates(trimmed);
  if (preset) return preset;

  // Hazır listede yoksa Open-Meteo Geocoding API'sini sunucu üzerinden güvenle sorgula
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&format=json`;
    const res = await channelFetch(
      ["geocoding-api.open-meteo.com", "open-meteo.com"],
      url,
      { headers: { "User-Agent": "Verein-ERP-Weather-Module/1.0" } },
      { moduleKey: "weather", category: "EXTERNAL_API", provider: "open_meteo", count: 1, unit: "requests", legalBasis: "LEGITIMATE_INTEREST" },
    );
    if (!res.ok) return null;

    const json = (await res.json()) as {
      results?: Array<{ name: string; latitude: number; longitude: number }>;
    };
    const first = json.results?.[0];
    if (!first || typeof first.latitude !== "number" || typeof first.longitude !== "number") {
      return null;
    }

    return {
      name: first.name,
      lat: Number(first.latitude.toFixed(2)),
      lon: Number(first.longitude.toFixed(2)),
    };
  } catch {
    return null;
  }
}

const geocodeCache = new Map<string, { name: string; lat: number; lon: number } | null>();

/**
 * #585: Derneğin şehri (kurum profili) → koordinatlar. Hazır listede yoksa bir kez çevrimiçi aranır ve sonuç
 * (sınırlı) önbellekte tutulur. Şehir yoksa veya bulunamazsa varsayılan konum kullanılır. Önceden sayfa, kart ve
 * başlık widget'ı her zaman Frankfurt'u gösteriyordu.
 */
export async function resolveOrganizationLocation(options: { allowNetwork?: boolean } = {}): Promise<{ name: string; lat: number; lon: number }> {
  const fallback = { name: DEFAULT_COORDINATES.city, lat: DEFAULT_COORDINATES.latitude, lon: DEFAULT_COORDINATES.longitude };
  let city: string | null = null;
  try {
    const { getOrganizationProfile } = await import("@/modules/organization/server");
    city = (await getOrganizationProfile())?.city?.trim() || null;
  } catch {
    return fallback;
  }
  if (!city) return fallback;
  const key = city.toLocaleLowerCase("de");
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? fallback;
  const preset = findCityCoordinates(city);
  if (preset) return preset;
  if (options.allowNetwork === false) return fallback;
  const found = await searchCityCoordinates(city);
  boundedSet(geocodeCache, key, found);
  return found ?? fallback;
}

/** Derneğin şehri için hava durumu (sayfa, kart, başlık widget'ı). */
export async function getOrganizationWeather(): Promise<WeatherData | null> {
  const location = await resolveOrganizationLocation();
  return getWeatherData(location.lat, location.lon, location.name);
}

export const DEFAULT_COORDINATES = {
  city: "Frankfurt am Main",
  latitude: 50.11,
  longitude: 8.68,
};

export function getCachedWeatherData(
  latitude = DEFAULT_COORDINATES.latitude,
  longitude = DEFAULT_COORDINATES.longitude,
): WeatherData | null {
  const roundedLat = Number(latitude.toFixed(2));
  const roundedLon = Number(longitude.toFixed(2));
  const cacheKey = `${roundedLat},${roundedLon}`;
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

export async function getWeatherData(
  latitude = DEFAULT_COORDINATES.latitude,
  longitude = DEFAULT_COORDINATES.longitude,
  city = DEFAULT_COORDINATES.city,
): Promise<WeatherData | null> {
  if (typeof latitude !== "number" || typeof longitude !== "number" || isNaN(latitude) || isNaN(longitude)) {
    return null;
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  const roundedLat = Number(latitude.toFixed(2));
  const roundedLon = Number(longitude.toFixed(2));
  const cacheKey = `${roundedLat},${roundedLon}`;
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const res = await channelFetch(
      ["api.open-meteo.com", "open-meteo.com"],
      url,
      { headers: { "User-Agent": "Verein-ERP-Weather-Module/1.0" } },
      { moduleKey: "weather", category: "EXTERNAL_API", provider: "open_meteo", count: 1, unit: "requests", legalBasis: "LEGITIMATE_INTEREST" },
    );

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
        weather_code?: number;
        is_day?: number;
        precipitation?: number;
      };
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        weather_code?: number[];
        precipitation_sum?: number[];
      };
      hourly?: {
        time?: string[];
        temperature_2m?: number[];
        weather_code?: number[];
      };
    };

    const code = json.current?.weather_code ?? 0;
    const cond = getConditionInfo(code);

    const result: WeatherData = {
      city,
      latitude: roundedLat,
      longitude: roundedLon,
      temperature: Math.round(json.current?.temperature_2m ?? 18),
      apparentTemperature: Math.round(json.current?.apparent_temperature ?? 18),
      humidity: json.current?.relative_humidity_2m ?? 50,
      windSpeed: Math.round(json.current?.wind_speed_10m ?? 10),
      weatherCode: code,
      conditionTextTr: cond.tr,
      conditionTextDe: cond.de,
      isDay: json.current?.is_day === 1,
      precipitation: json.current?.precipitation ?? 0,
      daily: {
        dates: json.daily?.time?.slice(0, 7) ?? [],
        maxTemps: (json.daily?.temperature_2m_max?.slice(0, 7) ?? []).map((t) => Math.round(t)),
        minTemps: (json.daily?.temperature_2m_min?.slice(0, 7) ?? []).map((t) => Math.round(t)),
        weatherCodes: json.daily?.weather_code?.slice(0, 7) ?? [],
        precipitationSums: json.daily?.precipitation_sum?.slice(0, 7) ?? [],
      },
      hourly: {
        times: json.hourly?.time?.slice(0, 24) ?? [],
        temps: (json.hourly?.temperature_2m?.slice(0, 24) ?? []).map((t) => Math.round(t)),
        weatherCodes: json.hourly?.weather_code?.slice(0, 24) ?? [],
      },
      updatedAt: new Date().toISOString(),
    };

    boundedSet(weatherCache, cacheKey, { data: result, timestamp: now });
    return result;
  } catch {
    // Ağ arızasında veya hatada null dön; sahte veri döndürme ve hatayı önbelleğe alma (#385)
    return null;
  }
}
