/**
 * Saf (Pure) yardımcı ve matematiksel fonksiyonlar.
 * Dış dünyaya veya çalışma zamanına yan etkisi (side effect) yoktur.
 */

export function calculateCapacityRatio(
  registered: number,
  capacity: number | null,
): number {
  if (!capacity || capacity <= 0) return 0
  const ratio = Math.round((registered / capacity) * 100)
  return Math.min(100, Math.max(0, ratio))
}

/** Tarih + saat (Europe/Berlin); locale "de" ise Almanca, aksi halde Türkçe biçim. */
export function formatDateTimeTr(date: Date | string, locale: string = "tr"): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "tr-TR", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function formatDateRange(
  start: Date | string,
  end?: Date | string | null,
  locale: string = "tr",
): string {
  const formattedStart = formatDateTimeTr(start, locale)
  if (!end) return formattedStart
  const formattedEnd = formatDateTimeTr(end, locale)
  return `${formattedStart} - ${formattedEnd}`
}
