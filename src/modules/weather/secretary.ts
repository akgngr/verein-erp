import "server-only";

import { defineModuleSecretary, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";
import { weatherPermissions } from "./permissions";
import { getCachedWeatherData, getConditionInfo, DEFAULT_COORDINATES, findCityCoordinates } from "./services/weather";

function berlinDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function buildWeatherBriefing(context: SecretaryContext): Promise<BriefingItem[]> {
  try {
    let lat = DEFAULT_COORDINATES.latitude;
    let lon = DEFAULT_COORDINATES.longitude;

    try {
      const { getOrganizationProfile } = await import("@/modules/organization/server");
      const profile = await getOrganizationProfile();
      if (profile?.city) {
        const coords = findCityCoordinates(profile.city);
        if (coords) {
          lat = coords.lat;
          lon = coords.lon;
        }
      }
    } catch {
      // organization profili okunamıyorsa varsayılan koordinatları kullan
    }

    // Sıcak patika (hot path): Dış API çağrısı yapılmaz, yalnız önbellekteki değer kullanılır
    const data =
      getCachedWeatherData(lat, lon) ??
      getCachedWeatherData(DEFAULT_COORDINATES.latitude, DEFAULT_COORDINATES.longitude);
    if (!data) {
      return [];
    }

    const cond = getConditionInfo(data.weatherCode);
    const day = berlinDay(context.now);
    const condLabel = context.t(`conditions.${data.weatherCode}`) || context.t("conditions.fallback");

    const items: BriefingItem[] = [
      {
        id: "weather:today",
        module: "weather",
        kind: "advisory",
        severity: cond.isAdverse ? "warning" : "info",
        title: context.t("secretary.dailyForecast", {
          temp: data.temperature,
          cond: condLabel,
        }),
        detail: cond.isAdverse ? context.t("secretary.outdoorWarning") : undefined,
        dueAt: day,
        href: "/weather",
      },
    ];

    return items;
  } catch {
    return [];
  }
}

export const secretary = defineModuleSecretary({
  module: "weather",
  providers: [
    {
      key: "advisory",
      permission: { definition: weatherPermissions, action: "view" },
      collect: async (context) => buildWeatherBriefing(context),
    },
  ],
});
