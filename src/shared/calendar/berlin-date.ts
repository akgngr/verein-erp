/**
 * #584: Tüm gün takvim kayıtlarının ortak saklama düzeni: Europe/Berlin gece yarısı.
 *
 * Takvim arayüzü tüm gün kaydını tarayıcının (Berlin) gece yarısı → 23:59 aralığı olarak saklar. Dış takvimlerden
 * (Google, Outlook, iCloud) gelen tüm gün kayıtları da aynı düzene çevrilir; böylece sunucunun saat diliminden
 * (Docker'da UTC) bağımsız olarak tek günlük kayıt Berlin'de tek gün görünür ve ICS'de doğru tarihle yayımlanır.
 */
const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function berlinOffsetMs(date: Date): number {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Verilen takvim gününün Berlin'deki 00:00 anı (yaz/kış saati dahil). `month` 1–12. */
export function berlinMidnight(year: number, month: number, day: number): Date {
  const wall = Date.UTC(year, month - 1, day);
  let utc = wall - berlinOffsetMs(new Date(wall));
  utc = wall - berlinOffsetMs(new Date(utc));
  return new Date(utc);
}

/** UTC anını Berlin duvar saatine ("YYYY-MM-DDTHH:mm") çevirir; etkinlik formunun beklediği biçim. */
export function berlinLocalDateTime(date: Date): string {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
