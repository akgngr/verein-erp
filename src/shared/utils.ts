/**
 * Tarih/saat gösterimi: dd.MM.yyyy HH:mm — Europe/Berlin.
 *
 * KARAR: date-fns'in saat dilimi desteği ayrı bir paket (date-fns-tz) gerektirdiği
 * ve ek kütüphane yasak olduğu için biçimlendirme Intl.DateTimeFormat ile yapılır.
 * Veritabanında UTC saklanır, gösterim Europe/Berlin saat dilimindedir.
 */
const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Berlin",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_TIME_FORMATTER.format(date);
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return DATE_FORMATTER.format(date);
}

/** AuditLog.userLabel biçimi: "Ad <eposta>" */
export function buildUserLabel(name: string, email: string): string {
  return `${name} <${email.toLowerCase()}>`;
}

/** Basit sınıf adı birleştirici (ek bağımlılık kullanılmaz). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
