/**
 * #584: Etkinlik saatleri Europe/Berlin duvar saati olarak girilir ve gösterilir; veritabanında UTC saklanır.
 *
 * `<input type="datetime-local">` saat dilimi içermeyen "YYYY-MM-DDTHH:mm" değeri üretir. Bu değer sunucuda
 * `new Date(...)` ile çözülürse sunucunun saat dilimi (Docker'da UTC) kullanılır ve Berlin'de saat 1–2 saat
 * kayar. Bu yardımcılar dönüşümü açıkça Europe/Berlin üzerinden yapar (yaz/kış saati dahil).
 * Saf fonksiyonlardır; istemcide ve sunucuda aynı sonucu verir.
 */

export const EVENT_TIME_ZONE = "Europe/Berlin";

/** "YYYY-MM-DDTHH:mm" (isteğe bağlı ":ss") biçimi. */
export const LOCAL_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: EVENT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function berlinParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const map = Object.fromEntries(partsFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Berlin'in verilen andaki UTC farkı (ms). */
function berlinOffsetMs(date: Date): number {
  const p = berlinParts(date);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Berlin duvar saatini ("2026-12-05T14:00") UTC anına çevirir. Geçersiz veya takvimde olmayan bir değer
 * (ör. 2026-02-30) için `null` döner. Yaz saatine geçişte atlanan saat bir sonraki geçerli ana kayar.
 */
export function berlinLocalToUtc(value: string): Date | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s ?? "0");
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return null;
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(wall);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  // İki adımlı düzeltme: önce tahmini fark, sonra o andaki gerçek fark (yaz/kış saati sınırı).
  let utc = wall - berlinOffsetMs(new Date(wall));
  utc = wall - berlinOffsetMs(new Date(utc));
  return new Date(utc);
}

/** UTC anını `<input type="datetime-local">` için Berlin duvar saatine ("YYYY-MM-DDTHH:mm") çevirir. */
export function utcToBerlinLocalInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const p = berlinParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
