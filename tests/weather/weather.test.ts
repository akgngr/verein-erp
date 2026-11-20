import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getConditionInfo, WMO_CODES } from "@/modules/weather";
import { getWeatherData } from "@/modules/weather/server";
import { aiWeatherTool } from "@/modules/weather/ai";
import { buildWeatherBriefing } from "@/modules/weather/secretary";

describe("Weather module tests", () => {
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

  it("getWeatherData returns a valid WeatherData structure", async () => {
    const data = await getWeatherData();
    assert.ok(data.city);
    assert.equal(typeof data.temperature, "number");
    assert.equal(typeof data.apparentTemperature, "number");
    assert.equal(typeof data.humidity, "number");
    assert.equal(typeof data.windSpeed, "number");
    assert.ok(Array.isArray(data.daily.dates));
    assert.ok(Array.isArray(data.daily.maxTemps));
    assert.ok(Array.isArray(data.daily.minTemps));
    assert.ok(Array.isArray(data.hourly.times));
  });

  it("secretary provider generates valid weather advisory items", async () => {
    const mockContext = {
      user: { id: "test-user-id", role: "ADMIN" as const },
      now: new Date("2026-11-20T10:00:00.000Z"),
      t: (key: string, values?: Record<string, string | number>) => {
        if (key === "secretary.dailyForecast") {
          return `Bugün hava ${values?.temp}°, ${values?.cond}.`;
        }
        if (key === "secretary.outdoorWarning") {
          return "Açık alan etkinlikleri için hava koşullarını göz önünde bulundurun.";
        }
        return key;
      },
    };

    const items = await buildWeatherBriefing(mockContext);
    assert.ok(Array.isArray(items));
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "weather:today");
    assert.equal(items[0].module, "weather");
    assert.equal(items[0].kind, "advisory");
    assert.ok(items[0].title.includes("Bugün hava"));
  });

  it("aiWeatherTool is properly configured with v2 AI contract", () => {
    assert.equal(aiWeatherTool.name, "get_current_weather");
    assert.equal(aiWeatherTool.operation, "read");
    assert.equal(aiWeatherTool.policy.purpose, "weather-forecast");
  });
});
