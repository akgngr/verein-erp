/**
 * DATEV ASCII (EXTF) ortak yardımcıları: Windows-1252 kodlama, metin alanı, zaman damgası.
 * Modüller (students, accounting …) kendi Datenkategorie'lerini bunların üzerine kurar.
 */

/** Windows-1252'de olmayan Türkçe harfler (DATEV ASCII içe aktarımı ANSI bekler). */
const TRANSLITERATE: Record<string, string> = { ş: "s", Ş: "S", ğ: "g", Ğ: "G", ı: "i", İ: "I" };
const CP1252_EXTRA: Record<string, number> = { "€": 0x80, "„": 0x84, "“": 0x93, "”": 0x94, "–": 0x96, "—": 0x97 };

/** Metni Windows-1252 baytlarına çevirir; karşılığı olmayan karakter "?" olur. */
export function encodeCp1252(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const raw of text) {
    for (const char of TRANSLITERATE[raw] ?? raw) {
      const code = char.charCodeAt(0);
      if (code < 0x80 || (code >= 0xa0 && code <= 0xff)) bytes.push(code);
      else bytes.push(CP1252_EXTRA[char] ?? 0x3f);
    }
  }
  return Uint8Array.from(bytes);
}

/** DATEV metin alanı: çift tırnak içinde, içteki tırnak ikilenir, alan uzunluğu kırpılır. */
export function datevText(value: string | null | undefined, max: number): string {
  const text = (value ?? "").replace(/[\r\n;]+/g, " ").slice(0, max);
  return `"${text.replace(/"/g, '""')}"`;
}

/** EXTF başlığı için YYYYMMDDHHMMSSmmm (UTC). */
export function datevTimestamp(now: Date): string {
  const pad = (value: number, length = 2) => String(value).padStart(length, "0");
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}${pad(now.getUTCMilliseconds(), 3)}`;
}

/** YYYYMMDD (UTC tarih bileşenleri). */
export function datevDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

/** Cent → "1234,56" (DATEV ondalık virgül, binlik ayırıcı yok). */
export function datevAmount(cents: number): string {
  const abs = Math.abs(cents);
  return `${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}
