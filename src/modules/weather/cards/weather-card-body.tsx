"use client";

import { useState, useTransition } from "react";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  Snowflake,
  CloudSun,
  Droplets,
  MapPin,
  Navigation,
  Sun,
  Wind,
} from "lucide-react";

import { useLocale, useTranslations } from "next-intl";

import type { WeatherData } from "../services/weather";
import { fetchWeatherByCoordsAction } from "../actions/weather-actions";

function getWeatherIcon(code: number, isDay: boolean) {
  if (code === 0 || code === 1) {
    return isDay ? (
      <Sun className="size-8 text-amber-500 animate-spin-slow" aria-hidden="true" />
    ) : (
      <CloudSun className="size-8 text-indigo-400" aria-hidden="true" />
    );
  }
  if (code === 2 || code === 3) {
    return <CloudSun className="size-8 text-sky-500" aria-hidden="true" />;
  }
  if (code === 45 || code === 48) {
    return <CloudFog className="size-8 text-slate-400" aria-hidden="true" />;
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return <CloudRain className="size-8 text-blue-500" aria-hidden="true" />;
  }
  // #585: Kar kodları (WMO 71–77, 85–86) önceden genel bulut simgesiyle gösteriliyordu.
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return <Snowflake className={"size-8 text-sky-400"} aria-hidden="true" />;
  }
  if ([95, 96, 99].includes(code)) {
    return <CloudLightning className="size-8 text-purple-500" aria-hidden="true" />;
  }
  return <Cloud className="size-8 text-slate-400" aria-hidden="true" />;
}

export function WeatherCardBody({
  initialWeather,
}: {
  initialWeather: WeatherData | null;
}) {
  const t = useTranslations("weather");
  const locale = useLocale();
  const [weather, setWeather] = useState<WeatherData | null>(initialWeather);
  const [locating, setLocating] = useState(false);
  const [, startTransition] = useTransition();

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        startTransition(async () => {
          try {
            const res = await fetchWeatherByCoordsAction({
              lat: latitude,
              lon: longitude,
              cityName: t("cards.current.myLocation"),
            });
            if (res.ok && res.data) {
              setWeather({
                ...res.data,
                city: t("cards.current.myLocation"),
              });
            }
          } catch {
            // Sessizce mevcut durumu koru
          } finally {
            setLocating(false);
          }
        });
      },
      () => {
        setLocating(false);
      },
      { timeout: 8000 },
    );
  };

  if (!weather) {
    return (
      <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-slate-500/10 via-slate-500/5 to-transparent border border-slate-500/20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 text-sm font-medium text-ink-700 dark:text-ink-200">
            <Cloud className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate">{t("cards.current.title")}</span>
          </div>
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={locating}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50"
            title={t("cards.current.detectLocationTooltip")}
          >
            <Navigation className={`size-3 ${locating ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>{locating ? t("cards.current.locating") : t("cards.current.detectLocation")}</span>
          </button>
        </div>
        <div className="mt-4 flex flex-col items-center justify-center py-4 text-center">
          <Cloud className="size-8 text-ink-400 dark:text-ink-500 mb-2" aria-hidden="true" />
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {t("cards.current.unavailable")}
          </p>
        </div>
      </div>
    );
  }

  const isDaytime = weather.isDay;
  const conditionText = locale === "de" ? weather.conditionTextDe : weather.conditionTextTr;

  return (
    <div
      className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 ${
        isDaytime
          ? "bg-gradient-to-br from-sky-500/10 via-amber-500/5 to-transparent border border-sky-500/20"
          : "bg-gradient-to-br from-indigo-950/40 via-purple-900/20 to-transparent border border-indigo-500/20"
      }`}
    >
      {/* Header bar: City & Geolocation trigger */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 text-sm font-medium text-ink-700 dark:text-ink-200">
          <MapPin className="size-4 shrink-0 text-sky-500" aria-hidden="true" />
          <span className="truncate">{weather.city}</span>
        </div>
        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={locating}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 transition-colors focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50"
          title={t("cards.current.detectLocationTooltip")}
        >
          <Navigation className={`size-3 ${locating ? "animate-spin" : ""}`} aria-hidden="true" />
          <span>{locating ? t("cards.current.locating") : t("cards.current.detectLocation")}</span>
        </button>
      </div>

      {/* Main weather stats */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold tracking-tight text-ink-900 dark:text-white">
            {weather.temperature}°
          </span>
          <span className="text-xs font-medium text-ink-500">
            {t("cards.current.feelsLike", { temp: weather.apparentTemperature })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getWeatherIcon(weather.weatherCode, weather.isDay)}
        </div>
      </div>

      {/* Condition label */}
      <p className="mt-1 text-sm font-medium text-ink-600 dark:text-ink-300">
        {conditionText}
      </p>

      {/* Metrics Row */}
      <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-ink-100 dark:border-white/10 text-xs text-ink-600 dark:text-ink-400">
        <div className="flex items-center gap-1.5">
          <Droplets className="size-3.5 text-blue-500" aria-hidden="true" />
          <span>{t("cards.current.humidity")}:</span>
          <span className="font-semibold text-ink-800 dark:text-ink-100">{weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Wind className="size-3.5 text-teal-500" aria-hidden="true" />
          <span>{t("cards.current.wind")}:</span>
          <span className="font-semibold text-ink-800 dark:text-ink-100">{weather.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  );
}
