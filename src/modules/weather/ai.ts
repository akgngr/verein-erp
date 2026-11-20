import "server-only";

import { z } from "zod";
import { defineModuleAiV2, aiToolV2 } from "@/shared/ai/v2";
import { can } from "@/shared/permissions/define";
import { weatherPermissions } from "./permissions";
import { getWeatherData, getConditionInfo, DEFAULT_COORDINATES, findCityCoordinates } from "./services/weather";

const WeatherOutputSchema = z
  .object({
    city: z.string(),
    temperature: z.number(),
    apparentTemperature: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    conditionText: z.string(),
    isAdverse: z.boolean(),
    todayMin: z.number(),
    todayMax: z.number(),
  })
  .strict();

export const aiWeatherTool = aiToolV2({
  name: "get_current_weather",
  operation: "read",
  allowed: (user) => can(user.role, weatherPermissions, "view"),
  description:
    "Get current weather conditions and temperature for event and meeting planning.", // i18n-ignore (model-facing tool text)
  input: z
    .object({
      city: z.string().optional(),
    })
    .strict(),
  result: WeatherOutputSchema,
  modelOutput: WeatherOutputSchema,
  policy: {
    purpose: "weather-forecast",
    serverReads: [],
    modelFields: [
      "city",
      "temperature",
      "apparentTemperature",
      "humidity",
      "windSpeed",
      "conditionText",
      "isAdverse",
      "todayMin",
      "todayMax",
    ],
    processing: "approved_provider",
    modelDataClass: "aggregate",
  },
  projectForModel: (result) => result,
  run: async (input) => {
    let lat = DEFAULT_COORDINATES.latitude;
    let lon = DEFAULT_COORDINATES.longitude;
    let cityName = input.city ?? DEFAULT_COORDINATES.city;

    if (input.city) {
      const match = findCityCoordinates(input.city);
      if (match) {
        lat = match.lat;
        lon = match.lon;
        cityName = match.name;
      }
    }

    const data = await getWeatherData(lat, lon, cityName);
    const cond = getConditionInfo(data.weatherCode);

    return {
      city: data.city,
      temperature: data.temperature,
      apparentTemperature: data.apparentTemperature,
      humidity: data.humidity,
      windSpeed: data.windSpeed,
      conditionText: cond.tr,
      isAdverse: cond.isAdverse,
      todayMin: data.daily.minTemps[0] ?? data.temperature - 4,
      todayMax: data.daily.maxTemps[0] ?? data.temperature + 4,
    };
  },
});

export const ai = defineModuleAiV2({
  module: "weather",
  tools: [aiWeatherTool],
  actions: {},
});
