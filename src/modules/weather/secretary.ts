import "server-only";

import { defineModuleSecretary, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";
import { weatherPermissions } from "./permissions";
import { getWeatherData, getConditionInfo } from "./services/weather";

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
    const data = await getWeatherData();
    const cond = getConditionInfo(data.weatherCode);
    const day = berlinDay(context.now);

    const items: BriefingItem[] = [
      {
        id: "weather:today",
        module: "weather",
        kind: "advisory",
        severity: cond.isAdverse ? "warning" : "info",
        title: context.t("secretary.dailyForecast", {
          temp: data.temperature,
          cond: cond.tr,
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
