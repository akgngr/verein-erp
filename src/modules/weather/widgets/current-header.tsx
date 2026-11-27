"use client";

import { useCallback, useEffect, useState } from "react";
import { Cloud, CloudRain, CloudSun, MapPin, Moon, RefreshCw, Sun, Wind, Droplets, Snowflake } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { fetchOrganizationWeatherAction } from "../actions/weather-actions";
import type { WeatherData } from "../services/weather";

/** Explicit fixed city, not a claim to know the user's position. The weather page supports geolocation. */

function WeatherIcon({ value }: { value: WeatherData }) {
  const code = value.weatherCode;
  const Icon = [71,73,75,77,85,86].includes(code)
    ? Snowflake : [51,53,55,61,63,65,80,81,82,95,96,99].includes(code)
    ? CloudRain : code >= 2 ? Cloud : !value.isDay ? Moon : code === 1 ? CloudSun : Sun;
  return <Icon className="size-5 text-sky-600 transition-transform duration-300 motion-safe:group-hover:-translate-y-0.5 dark:text-sky-300" aria-hidden="true" />;
}

export default function CurrentWeatherHeaderWidget() {
  const locale = useLocale();
  const translate = useTranslations("weather.widget");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(async (active: () => boolean) => {
    try {
      // #585: Derneğin şehri (kurum profili); önceden sabit bir şehir kullanılıyordu.
      const result = await fetchOrganizationWeatherAction();
      if (!active()) return;
      if (result.ok && result.data) {
        setWeather(result.data);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      if (active()) setError(true);
    } finally {
      if (active()) setBusy(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    // Defer the first load so no state update runs synchronously inside the effect (react-hooks/set-state-in-effect).
    void Promise.resolve().then(() => refresh(() => mounted));
    return () => { mounted = false; };
  }, [refresh]);

  return (
    <div className="relative">
      <button type="button" aria-label={translate("title")} aria-expanded={expanded} onClick={() => setExpanded((x) => !x)}
        className="group inline-flex h-9 items-center gap-2 rounded-xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 to-indigo-500/5 px-3 text-xs font-semibold text-ink-800 transition-colors duration-200 hover:border-sky-500/40 hover:bg-sky-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:text-ink-100">
        {weather ? <WeatherIcon value={weather} /> : <CloudSun className="size-5 text-sky-500" aria-hidden="true" />}
        <span>{weather ? `${Math.round(weather.temperature)}° · ${weather.city}` : "—"}</span>
        {busy && <RefreshCw className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
      </button>
      {expanded && (
        <section aria-label={translate("title")} className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[90vw] rounded-2xl border border-sky-500/20 bg-surface p-4 text-ink-900 shadow-xl dark:text-ink-100">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold"><MapPin className="size-3.5 text-sky-500" aria-hidden="true" />{weather?.city ?? "—"}</span>
            <button type="button" disabled={busy} onClick={() => { setBusy(true); void refresh(() => true); }} aria-label={translate("refresh")} title={translate("refresh")}
              className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-sky-500/10 focus-visible:outline-2 focus-visible:outline-sky-500 disabled:opacity-50">
              <RefreshCw className={`size-4 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
            </button>
          </div>
          {weather ? <>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">{Math.round(weather.temperature)}°</span>
              <div className="min-w-0 text-xs text-ink-500">
                <p className="font-medium text-ink-800 dark:text-ink-100">{locale === "de" ? weather.conditionTextDe : weather.conditionTextTr}</p>
                <p>{translate("feels")}: {Math.round(weather.apparentTemperature)}°</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-sky-500/15 pt-3 text-xs text-ink-600 dark:text-ink-300">
              <span className="inline-flex items-center gap-1"><Droplets className="size-3.5 text-sky-500" aria-hidden="true" />{translate("humidity")} {weather.humidity}%</span>
              <span className="inline-flex items-center gap-1"><Wind className="size-3.5 text-teal-500" aria-hidden="true" />{weather.windSpeed} km/h</span>
            </div>
          </> : <p role="status" className="py-4 text-xs text-ink-500">{busy ? "…" : translate("unavailable")}</p>}
          {error && <p role="status" className="mt-2 text-xs text-amber-600">{translate("unavailable")}</p>}
          <Link href="/weather" className="mt-3 block text-right text-xs font-semibold text-sky-700 underline-offset-2 hover:underline dark:text-sky-400">{translate("more")}</Link>
        </section>
      )}
    </div>
  );
}
