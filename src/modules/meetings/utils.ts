import type { ActionItemStatus } from "@prisma/client";

/**
 * Europe/Berlin takvim yardımcıları (tarih-only işleyiş, 4. ve 5. bölüm).
 *
 * KARAR: documents modülündeki yardımcılarla aynı kurallar; modüller arası
 * import yasak olduğu için (2. bölüm) meetings modülünde yerel kopyadır.
 * Tarih alanları (meetingDate, dueDate) veritabanında UTC gece yarısı olarak
 * tutulur; "bugün" ve yıl Europe/Berlin takvimine göre hesaplanır.
 */

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

/** Europe/Berlin takvimindeki yıl (numara üretimi 5. bölüm md. 1). */
export function berlinYear(date: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin",
      year: "numeric",
    }).format(date),
  );
}

/** YYYY-MM-DD string'ini UTC gece yarısı Date'e çevirir; geçersizse null döner. */
export function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "HH:mm" biçimini dakikaya çevirir; geçersizse null döner. */
export function parseTimeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

/** 5. bölüm md. 10: dueDate bugünden (Europe/Berlin) önceyse ve görev açıksa gecikmiştir. */
export function isActionItemOverdue(
  status: ActionItemStatus,
  dueDate: Date | null,
  today: Date = berlinToday(),
): boolean {
  if (!dueDate) return false;
  if (status !== "OPEN") return false;
  return dueDate.getTime() < today.getTime();
}
