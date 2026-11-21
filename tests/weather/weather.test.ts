import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";

import { getConditionInfo, WMO_CODES } from "@/modules/weather";
import {
  getWeatherData,
  getCachedWeatherData,
  setCachedWeatherData,
  clearWeatherCache,
  findCityCoordinates,
} from "@/modules/weather/server";
import { aiWeatherTool } from "@/modules/weather/ai";
import { buildWeatherBriefing } from "@/modules/weather/secretary";
import {
  coordsWeatherSchema,
  citySearchSchema,
} from "@/modules/weather/actions/weather-actions";
import type { WeatherData } from "@/modules/weather";

const mockWeatherData: WeatherData = {
  city: "Frankfurt am Main",
  latitude: 50.11,
  longitude: 8.68,
  temperature: 20,
  apparentTemperature: 21,
  humidity: 50,
  windSpeed: 12,
  weatherCode: 0,
  conditionTextTr: "Açık ve Güneşli",
  conditionTextDe: "Klar und sonnig",
  isDay: true,
  precipitation: 0,
  daily: {
    dates: ["2026-11-20"],
    maxTemps: [22],
    minTemps: [15],
    weatherCodes: [0],
    precipitationSums: [0],
  },
  hourly: {
    times: ["12:00", "15:00"],
    temps: [20, 22],
    weatherCodes: [0, 0],
  },
  updatedAt: new Date().toISOString(),
};

describe("Weather module tests", () => {
  beforeEach(() => {
    clearWeatherCache();
  });

  it("getConditionInfo correctly resolves clear, rain, and stormy weather", () => {
    const clear = getConditionInfo(0);
    assert.equal(clear.code, 0);
    assert.equal(clear.isAdverse, false);
    assert.equal(clear.icon, "sun");

    const rain = getConditionInfo(63);
    assert.equal(rain.code, 63);
    assert.equal(rain.isAdverse, true);
    assert.equal(rain.icon, "rain");

    const thunder = getConditionInfo(95);
    assert.equal(thunder.code, 95);
    assert.equal(thunder.isAdverse, true);
    assert.equal(thunder.icon, "thunder");

    const fallback = getConditionInfo(999);
    assert.equal(fallback.isAdverse, false);
    assert.equal(fallback.icon, "cloud");
  });

  it("WMO_CODES table covers major weather categories", () => {
    assert.ok(WMO_CODES[0]);
    assert.ok(WMO_CODES[61]);
    assert.ok(WMO_CODES[71]);
    assert.ok(WMO_CODES[95]);
  });

  it("findCityCoordinates handles exact match, prefix match >= 3 chars, and rejects partial contains", () => {
    // Exact match
    const berlin = findCityCoordinates("Berlin");
    assert.ok(berlin);
    assert.equal(berlin.name, "Berlin");

    // Prefix match >= 3 chars
    const bremen = findCityCoordinates("bre");
    assert.ok(bremen);
    assert.equal(bremen.name, "Bremen");

    // Reject false contains (e.g. "en" should NOT match Bremen or Dresden)
    const enMatch = findCityCoordinates("en");
    assert.equal(enMatch, null);

    // Empty / short / unknown
    assert.equal(findCityCoordinates(""), null);
    assert.equal(findCityCoordinates("a"), null);
    assert.equal(findCityCoordinates("Atlantis"), null);
  });

  it("getWeatherData returns null on invalid coordinates", async () => {
    assert.equal(await getWeatherData(999, 0), null);
    assert.equal(await getWeatherData(0, -200), null);
    assert.equal(await getWeatherData(NaN, 0), null);
  });

  it("getCachedWeatherData returns cached data when primed, and null when empty", () => {
    assert.equal(getCachedWeatherData(50.11, 8.68), null);
    setCachedWeatherData(mockWeatherData);
    const cached = getCachedWeatherData(50.11, 8.68);
    assert.ok(cached);
    assert.equal(cached.city, "Frankfurt am Main");
    assert.equal(cached.temperature, 20);
  });

  it("secretary provider generates valid weather advisory only when cache is primed", async () => {
    const mockContext = {
      user: { id: "test-user-id", role: "ADMIN" as const },
      now: new Date("2026-11-20T10:00:00.000Z"),
      t: (key: string, values?: Record<string, string | number>) => {
        if (key.startsWith("conditions.")) {
          return "Güneşli";
        }
        if (key === "secretary.dailyForecast") {
          return `Bugün hava ${values?.temp}°, ${values?.cond}.`;
        }
        if (key === "secretary.outdoorWarning") {
          return "Açık alan etkinlikleri için hava koşullarını göz önünde bulundurun.";
        }
        return key;
      },
    };

    // Önbellek boşken sıcak patikada hiçbir öğe üretilmemeli (dış ağ çağrısı yok)
    const emptyItems = await buildWeatherBriefing(mockContext);
    assert.deepEqual(emptyItems, []);

    // Önbellek doluyken öğe üretilmeli
    setCachedWeatherData(mockWeatherData);
    const items = await buildWeatherBriefing(mockContext);
    assert.ok(Array.isArray(items));
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "weather:today");
    assert.equal(items[0].module, "weather");
    assert.equal(items[0].kind, "advisory");
    assert.ok(items[0].title.includes("Bugün hava 20°"));
  });

  it("aiWeatherTool is properly configured with v2 AI contract and handles unknown city", async () => {
    assert.equal(aiWeatherTool.name, "get_current_weather");
    assert.equal(aiWeatherTool.operation, "read");
    assert.equal(aiWeatherTool.policy.purpose, "weather-forecast");

    const mockAiContext = {
      user: { id: "test-user-id", name: "Test User", email: "test@example.com", role: "ADMIN" as const },
    };

    // Bilinmeyen şehir sorgusunda hata fırlatılmalı
    await assert.rejects(
      async () => {
        await aiWeatherTool.run({ city: "NonExistentCityXYZ" }, mockAiContext as never);
      },
      /UNKNOWN_CITY/,
    );
  });

  it("coordsWeatherSchema and citySearchSchema strictly validate bounds and length", () => {
    // Geçerli koordinatlar
    const validCoords = coordsWeatherSchema.safeParse({ lat: 52.52, lon: 13.41, cityName: "Berlin" });
    assert.equal(validCoords.success, true);

    // Sınır aşımı koordinatlar reddedilir
    assert.equal(coordsWeatherSchema.safeParse({ lat: 100, lon: 10 }).success, false);
    assert.equal(coordsWeatherSchema.safeParse({ lat: -95, lon: 10 }).success, false);
    assert.equal(coordsWeatherSchema.safeParse({ lat: 50, lon: 200 }).success, false);
    assert.equal(coordsWeatherSchema.safeParse({ lat: 50, lon: -190 }).success, false);
    assert.equal(coordsWeatherSchema.safeParse({ lat: 50, lon: 10, cityName: "A".repeat(81) }).success, false);

    // Şehir arama sorgu sınırları (2–80 karakter)
    assert.equal(citySearchSchema.safeParse({ query: "Berlin" }).success, true);
    assert.equal(citySearchSchema.safeParse({ query: "a" }).success, false);
    assert.equal(citySearchSchema.safeParse({ query: "   " }).success, false);
    assert.equal(citySearchSchema.safeParse({ query: "B".repeat(81) }).success, false);
  });
});
