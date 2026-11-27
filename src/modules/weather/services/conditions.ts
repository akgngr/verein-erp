/**
 * #585: Saf hava durumu tipleri ve WMO kodları. Modül `index.ts`'i yalnızca bunları dışa açar; böylece istemci
 * paketine (registry → index) sunucu tarafı servis (kurum profili, ağ çağrıları) taşınmaz.
 */
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


export const DEFAULT_COORDINATES = {
  city: "Frankfurt am Main",
  latitude: 50.11,
  longitude: 8.68,
};
