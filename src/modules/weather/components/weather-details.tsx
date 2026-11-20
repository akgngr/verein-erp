"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  Navigation,
  Search,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";

import type { WeatherData } from "../services/weather";

const PRESET_CITIES = [
  { name: "Frankfurt am Main", lat: 50.1109, lon: 8.6821 },
  { name: "Berlin", lat: 52.52, lon: 13.405 },
  { name: "Köln", lat: 50.9375, lon: 6.9603 },
  { name: "München", lat: 48.1351, lon: 11.582 },
  { name: "Wien", lat: 48.2082, lon: 16.3738 },
  { name: "Zürich", lat: 47.3769, lon: 8.5417 },
  { name: "İstanbul", lat: 41.0082, lon: 28.9784 },
];

function getWeatherIcon(code: number, isDay = true, className = "size-8") {
  if (code === 0 || code === 1) {
    return isDay ? (
      <Sun className={`${className} text-amber-500`} aria-hidden="true" />
    ) : (
      <CloudSun className={`${className} text-indigo-400`} aria-hidden="true" />
    );
  }
  if (code === 2 || code === 3) {
    return <CloudSun className={`${className} text-sky-500`} aria-hidden="true" />;
  }
  if (code === 45 || code === 48) {
    return <CloudFog className={`${className} text-slate-400`} aria-hidden="true" />;
  }
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
    return <CloudRain className={`${className} text-blue-500`} aria-hidden="true" />;
  }
  if ([95, 96, 99].includes(code)) {
    return <CloudLightning className={`${className} text-purple-500`} aria-hidden="true" />;
  }
  return <Cloud className={`${className} text-slate-400`} aria-hidden="true" />;
}

export function WeatherDetails({ initialWeather }: { initialWeather: WeatherData }) {
  const t = useTranslations("weather");
  const [weather, setWeather] = useState<WeatherData>(initialWeather);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [, startTransition] = useTransition();

  const fetchWeatherForCoords = (lat: number, lon: number, cityName: string) => {
    startTransition(async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();

        setWeather((prev) => ({
          ...prev,
          city: cityName,
          latitude: lat,
          longitude: lon,
          temperature: Math.round(json.current?.temperature_2m ?? prev.temperature),
          apparentTemperature: Math.round(json.current?.apparent_temperature ?? prev.apparentTemperature),
          humidity: json.current?.relative_humidity_2m ?? prev.humidity,
          windSpeed: Math.round(json.current?.wind_speed_10m ?? prev.windSpeed),
          weatherCode: json.current?.weather_code ?? prev.weatherCode,
          isDay: json.current?.is_day === 1,
          precipitation: json.current?.precipitation ?? 0,
          daily: {
            dates: json.daily?.time?.slice(0, 7) ?? prev.daily.dates,
            maxTemps: (json.daily?.temperature_2m_max?.slice(0, 7) ?? []).map((v: number) => Math.round(v)),
            minTemps: (json.daily?.temperature_2m_min?.slice(0, 7) ?? []).map((v: number) => Math.round(v)),
            weatherCodes: json.daily?.weather_code?.slice(0, 7) ?? prev.daily.weatherCodes,
            precipitationSums: json.daily?.precipitation_sum?.slice(0, 7) ?? prev.daily.precipitationSums,
          },
          hourly: {
            times: json.hourly?.time?.slice(0, 24) ?? prev.hourly.times,
            temps: (json.hourly?.temperature_2m?.slice(0, 24) ?? []).map((v: number) => Math.round(v)),
            weatherCodes: json.hourly?.weather_code?.slice(0, 24) ?? prev.hourly.weatherCodes,
          },
          updatedAt: new Date().toISOString(),
        }));
      } catch {
        // Hata durumunda mevcut durumu koru
      }
    });
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchWeatherForCoords(latitude, longitude, t("myLocation"));
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { timeout: 8000 },
    );
  };

  const handleCitySearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    startTransition(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            searchQuery.trim(),
          )}&count=1&format=json`,
        );
        if (!res.ok) return;
        const json = await res.json();
        const first = json.results?.[0];
        if (first) {
          fetchWeatherForCoords(first.latitude, first.longitude, first.name);
          setSearchQuery("");
        }
      } catch {
        // Hata durumunda sessiz kal
      }
    });
  };

  const isDay = weather.isDay;

  return (
    <div className="space-y-6">
      {/* Control Bar: Location Presets, Geolocation, and Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/70 dark:bg-ink-900/60 p-3 shadow-sm border border-ink-100 dark:border-white/10 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 focus-visible:outline-2 focus-visible:outline-sky-500 transition-colors disabled:opacity-50"
          >
            <Navigation className={`size-3.5 ${locating ? "animate-spin" : ""}`} aria-hidden="true" />
            <span>{locating ? t("locating") : t("detectLocation")}</span>
          </button>

          <span className="h-4 w-px bg-ink-200 dark:bg-white/10 mx-1" aria-hidden="true" />

          {PRESET_CITIES.map((city) => (
            <button
              key={city.name}
              type="button"
              onClick={() => fetchWeatherForCoords(city.lat, city.lon, city.name)}
              className={`rounded-xl px-2.5 py-1 text-xs font-medium transition-colors ${
                weather.city === city.name
                  ? "bg-ink-900 text-white dark:bg-white dark:text-ink-950 font-semibold"
                  : "text-ink-600 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-white/5"
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleCitySearch} className="relative flex items-center">
          <Search className="absolute left-2.5 size-3.5 text-ink-400 pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchCityPlaceholder")}
            className="w-48 sm:w-60 rounded-xl bg-ink-50 dark:bg-white/5 border border-ink-200/80 dark:border-white/10 pl-8 pr-3 py-1.5 text-xs text-ink-800 dark:text-ink-100 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
          />
        </form>
      </div>

      {/* Hero Weather Atmosphere Card */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-all duration-500 shadow-md ${
          isDay
            ? "bg-gradient-to-br from-sky-400/20 via-amber-300/10 to-indigo-500/10 border border-sky-400/30"
            : "bg-gradient-to-br from-indigo-950/80 via-purple-950/50 to-slate-900/90 border border-indigo-500/30 text-white"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-white/40 dark:bg-white/10 text-xs font-medium backdrop-blur-sm">
              <MapPin className="size-3.5 text-sky-500" aria-hidden="true" />
              <span>{weather.city}</span>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-6xl sm:text-7xl font-extrabold tracking-tighter">
                {weather.temperature}°
              </span>
              <div className="space-y-0.5">
                <p className="text-xl sm:text-2xl font-semibold">
                  {weather.conditionTextTr}
                </p>
                <p className="text-xs text-ink-500 dark:text-ink-300">
                  {t("feelsLike", { temp: weather.apparentTemperature })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-4 rounded-3xl bg-white/30 dark:bg-white/5 backdrop-blur-md shadow-inner border border-white/20">
            {getWeatherIcon(weather.weatherCode, weather.isDay, "size-20 sm:size-24")}
          </div>
        </div>

        {/* Vital Weather Metrics Grid */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-ink-900/10 dark:border-white/10">
          <div className="flex items-center gap-3 rounded-2xl bg-white/40 dark:bg-white/5 p-3">
            <Thermometer className="size-5 text-amber-500 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-ink-500 dark:text-ink-400">{t("todayRange")}</p>
              <p className="text-sm font-bold">
                {weather.daily.minTemps[0]}° / {weather.daily.maxTemps[0]}°
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/40 dark:bg-white/5 p-3">
            <Droplets className="size-5 text-blue-500 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-ink-500 dark:text-ink-400">{t("humidity")}</p>
              <p className="text-sm font-bold">{weather.humidity}%</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/40 dark:bg-white/5 p-3">
            <Wind className="size-5 text-teal-500 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-ink-500 dark:text-ink-400">{t("windSpeed")}</p>
              <p className="text-sm font-bold">{weather.windSpeed} km/s</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white/40 dark:bg-white/5 p-3">
            <CloudRain className="size-5 text-indigo-500 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs text-ink-500 dark:text-ink-400">{t("precipitation")}</p>
              <p className="text-sm font-bold">{weather.precipitation} mm</p>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Forecast Section */}
      <div className="rounded-3xl bg-white/70 dark:bg-ink-900/60 p-6 shadow-sm border border-ink-100 dark:border-white/10 backdrop-blur-md">
        <h3 className="text-base font-bold text-ink-900 dark:text-white mb-4">
          {t("forecastTitle")}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
          {weather.daily.dates.map((dateStr, idx) => {
            const date = new Date(dateStr);
            const dayName = date.toLocaleDateString("tr-TR", { weekday: "short" });
            const isToday = idx === 0;

            return (
              <div
                key={dateStr}
                className={`flex flex-col items-center justify-between rounded-2xl p-3 transition-colors ${
                  isToday
                    ? "bg-sky-500/15 border border-sky-500/30 font-semibold"
                    : "bg-ink-50/60 dark:bg-white/5 hover:bg-ink-100/60"
                }`}
              >
                <span className="text-xs text-ink-500 dark:text-ink-400">
                  {isToday ? t("today") : dayName}
                </span>
                <div className="my-2">
                  {getWeatherIcon(weather.daily.weatherCodes[idx] ?? 0, true, "size-7")}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="font-bold text-ink-900 dark:text-white">
                    {weather.daily.maxTemps[idx]}°
                  </span>
                  <span className="text-ink-400">
                    {weather.daily.minTemps[idx]}°
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
