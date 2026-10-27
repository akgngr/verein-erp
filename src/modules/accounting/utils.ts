/** Europe/Berlin takvim yardımcıları — muhasebe modülü (documents/members ile aynı kalıp). */

export function berlinToday(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
}

export function berlinYear(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric" }).format(date),
  );
}

/** YYYY-MM-DD string'ini UTC gece yarısı Date'e çevirir; geçersizse null döner. */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}
