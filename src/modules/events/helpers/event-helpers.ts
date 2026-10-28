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

export function formatDateTimeTr(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("tr-TR", {
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
): string {
  const formattedStart = formatDateTimeTr(start)
  if (!end) return formattedStart
  const formattedEnd = formatDateTimeTr(end)
  return `${formattedStart} - ${formattedEnd}`
}
