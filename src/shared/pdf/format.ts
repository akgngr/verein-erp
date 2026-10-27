/**
 * PDF biçim yardımcıları (Faz 4, 4.3): tarih dd.MM.yyyy; para lang'e göre
 * de-DE ("1.234,56 €") / tr-TR. Sunucu içinde çalışır (Intl tam destekli).
 */

import type { PdfLang } from "./i18n";

export function formatPdfDate(date: Date, _lang?: PdfLang): string {
  // KARAR: de/tr tarih aynı sayısal biçim (dd.MM.yyyy); uzun yazım gerekirse
  // param devreye alınacak. void ile "kullanılmadı" uyarısı bastırılır.
  void _lang;
  const iso = date.toISOString().slice(0, 10);
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
}

export function formatPdfMoney(cents: number, lang: PdfLang = "de"): string {
  return new Intl.NumberFormat(lang === "de" ? "de-DE" : "tr-TR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatPdfNumber(value: number, lang: PdfLang = "de"): string {
  return new Intl.NumberFormat(lang === "de" ? "de-DE" : "tr-TR").format(value);
}
