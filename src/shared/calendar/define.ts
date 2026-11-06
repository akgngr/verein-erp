import type { Role } from "@/shared/roles";

/**
 * Takvim kaynağı sözleşmesi (src/modules/<modül>/calendar.ts).
 *
 * Modüller kendi tarihli kayıtlarını takvime SALT OKUNUR sunar; kayıtlar kopyalanmaz.
 * `load` kendi yetki kontrolünü yapar (rol ve modül izni), yalnız istenen aralıktaki
 * kayıtları döndürür ve kişisel veri (ad, iletişim) içermez.
 */
export type CalendarSourceUser = { id: string; role: Role };

export type CalendarSourceItem = {
  /** Kaynak içinde benzersiz kimlik. */
  id: string;
  title: string;
  start: Date;
  /** Bitiş yoksa tüm gün / nokta etkinlik kabul edilir. */
  end?: Date | null;
  allDay: boolean;
  location?: string | null;
  /** Kaydın modüldeki detay sayfası. */
  href?: string | null;
};

export type CalendarSource = {
  /** Modül içinde benzersiz anahtar (çeviri: <modül>.calendar.<key>). */
  key: string;
  /** Varsayılan renk (#rrggbb). */
  color: string;
  load: (range: { from: Date; to: Date }, user: CalendarSourceUser) => Promise<CalendarSourceItem[]>;
};

export type ModuleCalendar = { module: string; sources: CalendarSource[] };

export const defineModuleCalendar = (definition: ModuleCalendar): ModuleCalendar => definition;

/** Combine a date-only value with an optional "HH:mm" local time. */
export function atTime(date: Date, time: string | null | undefined): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const match = time ? /^(\d{1,2}):(\d{2})$/.exec(time) : null;
  if (match) result.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return result;
}
