/** Europe/Berlin takvim yardımcıları — üyeler modülü için (documents ile aynı kalıp). */

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

export function berlinMonthRange(now: Date = new Date()): { start: Date; end: Date } {
  const today = berlinToday(now);
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  return { start, end };
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

/**
 * Alman adres alanlarını birleştirilmiş görüntüleme metnine çevirir.
 *
 * KARAR (Verein pivotu): format "Straße Hausnr, PLZ Stadt (Bundesland)".
 * Eksik parçalar atlanır; en azından street veya city yoksa null döner.
 * Bu, TR/DE fark etmeksizin yerel gösterim içindir — UI çevirisi t() ile
 * ayrıca yapılır (labels dil bazında gelir).
 */
export function formatAddress(args: {
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  state?: string | null;
}): string | null {
  const street = args.street?.trim() || null;
  const house = args.houseNumber?.trim() || null;
  const plz = args.postalCode?.trim() || null;
  const city = args.city?.trim() || null;
  const state = args.state?.trim() || null;

  if (!street && !city && !plz) return null;

  // "Straße Hausnr" (varsa)
  const streetPart = [street, house].filter(Boolean).join(" ");
  // "PLZ Stadt"
  const cityPart = [plz, city].filter(Boolean).join(" ");

  const main = [streetPart, cityPart].filter(Boolean).join(", ");
  if (!main) return state || null;
  return state ? `${main} (${state})` : main;
}

