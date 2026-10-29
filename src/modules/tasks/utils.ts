import type { TaskStatus } from "./types";

/** Europe/Berlin saat dilimindeki bugünü UTC gece yarısı Date olarak döner. */
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

/** YYYY-MM-DD string'ini UTC gece yarısı Date'e çevirir; geçersizse null döner. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date nesnesini YYYY-MM-DD string formatına çevirir. */
export function formatDateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * Görev gecikmiş mi:
 * dueDate bugünden (Europe/Berlin) önceyse ve durumu DONE veya CANCELLED değilse gecikmiştir.
 */
export function isTaskOverdue(
  status: TaskStatus,
  dueDate: Date | null,
  today: Date = berlinToday(),
): boolean {
  if (!dueDate) return false;
  if (status === "DONE" || status === "CANCELLED") return false;
  return dueDate.getTime() < today.getTime();
}
