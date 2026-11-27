import "server-only";

import { defineModuleSecretary, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";
import { weatherPermissions } from "./permissions";
import { getCachedWeatherData, getConditionInfo, DEFAULT_COORDINATES, resolveOrganizationLocation } from "./services/weather";

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
    // #585: Sayfa/kart ile aynı konum çözümü (hazır listede olmayan şehirler dahil). Sıcak patika: çevrimiçi
    // arama yapılmaz; konum önceden sayfa/kart tarafından çözülüp önbelleğe alınmış olmalıdır.
    const location = await resolveOrganizationLocation({ allowNetwork: false });
    const lat = location.lat;
    const lon = location.lon;

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
