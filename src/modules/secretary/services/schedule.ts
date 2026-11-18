/**
 * Günlük özet zamanlaması (T3.1). Saf fonksiyonlar: saat dilimi Europe/Berlin, yaz/kış saati Intl ile.
 * İş her 15 dakikada çalışır; bir kullanıcı için özet, yerel saat özet saatini geçtikten sonraki ilk
 * çalışmada ve sessiz saat dışında bir kez üretilir. Aynı yerel gün ikinci kez üretilmez.
 */

export const BRIEFING_TIME_ZONE = "Europe/Berlin";

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "HH:mm" → gün içindeki dakika; geçersizse null. */
export function parseClock(value: string | null | undefined): number | null {
  const match = value ? HHMM.exec(value) : null;
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Bir anın Europe/Berlin yerel tarihi ("YYYY-MM-DD") ve gün içindeki dakikası. */
export function berlinClock(now: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRIEFING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** Sessiz saat: [from, to) aralığı; gece yarısını aşabilir (22:00–07:00). İkisi de yoksa veya eşitse sessiz saat yok. */
export function isQuietTime(minutes: number, quietFrom?: string | null, quietTo?: string | null): boolean {
  const from = parseClock(quietFrom);
  const to = parseClock(quietTo);
  if (from === null || to === null || from === to) return false;
  return from < to ? minutes >= from && minutes < to : minutes >= from || minutes < to;
}

export type BriefingPreference = {
  briefingEnabled: boolean;
  briefingTime: string;
  quietFrom: string | null;
  quietTo: string | null;
  lastBriefingOn: string | null;
};

/** Bu çalışmada özet üretilmeli mi? Dönüş: üretilecekse yerel tarih (idempotent anahtar), değilse null. */
export function dueBriefingDate(preference: BriefingPreference, now: Date): string | null {
  if (!preference.briefingEnabled) return null;
  const at = parseClock(preference.briefingTime);
  if (at === null) return null;
  const clock = berlinClock(now);
  if (preference.lastBriefingOn === clock.date) return null;
  if (clock.minutes < at) return null;
  if (isQuietTime(clock.minutes, preference.quietFrom, preference.quietTo)) return null;
  return clock.date;
}
