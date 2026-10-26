import type { DocumentStatus } from "@prisma/client";

/**
 * Europe/Berlin takvim yardımcıları (tarih-only işleyiş, 4. ve 5. bölüm).
 *
 * KARAR: Tarih alanları (documentDate, dueDate) veritabanında UTC gece yarısı
 * olarak tutulur; "bugün" ve "bu ay" Europe/Berlin takvimine göre hesaplanır.
 * Bu yardımcılar modül içi ortak noktadır (sorgular, istatistik, gecikme kontrolü).
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

/** Europe/Berlin takvimindeki bugünün ayının [başlangıç, bitiş) aralığı. */
export function berlinMonthRange(now: Date = new Date()): { start: Date; end: Date } {
  const today = berlinToday(now);
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  return { start, end };
}

/** Kayıt yılı, registeredAt'in Europe/Berlin saatindeki yılıdır (5. bölüm md. 1). */
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

const OVERDUE_STATUSES: DocumentStatus[] = ["OPEN", "IN_PROGRESS"];

/** 5. bölüm md. 3: dueDate bugünden (Europe/Berlin) önceyse ve durum açık/işlemde ise gecikmiştir. */
export function isDocumentOverdue(
  status: DocumentStatus,
  dueDate: Date | null,
  today: Date = berlinToday(),
): boolean {
  if (!dueDate) return false;
  if (!OVERDUE_STATUSES.includes(status)) return false;
  return dueDate.getTime() < today.getTime();
}
