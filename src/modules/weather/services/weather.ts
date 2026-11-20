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

export const DEFAULT_COORDINATES = {
  city: "Frankfurt am Main",
  latitude: 50.1109,
  longitude: 8.6821,
};

export async function getWeatherData(
  latitude = DEFAULT_COORDINATES.latitude,
  longitude = DEFAULT_COORDINATES.longitude,
  city = DEFAULT_COORDINATES.city,
): Promise<WeatherData> {
  const cacheKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = weatherCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Verein-ERP-Weather-Module/1.0" },
      next: { revalidate: 900 }, // 15 dakika Next.js cache
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
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
      latitude,
      longitude,
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

    weatherCache.set(cacheKey, { data: result, timestamp: now });
    return result;
  } catch {
    // Hata durumunda güvenli yedek veri
    const fallbackCond = getConditionInfo(0);
    return {
      city,
      latitude,
      longitude,
      temperature: 19,
      apparentTemperature: 19,
      humidity: 55,
      windSpeed: 12,
      weatherCode: 0,
      conditionTextTr: fallbackCond.tr,
      conditionTextDe: fallbackCond.de,
      isDay: true,
      precipitation: 0,
      daily: {
        dates: [new Date().toISOString().split("T")[0]],
        maxTemps: [21],
        minTemps: [14],
        weatherCodes: [0],
        precipitationSums: [0],
      },
      hourly: {
        times: ["12:00", "15:00", "18:00"],
        temps: [19, 21, 18],
        weatherCodes: [0, 0, 0],
      },
      updatedAt: new Date().toISOString(),
    };
  }
}
