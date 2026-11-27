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

/**
 * Normalizes a German Finanzamt name by stripping redundant leading
 * "Finanzamt" / "Finanzamtes" / "Finanzamts" prefixes before inserting into
 * fixed legal templates (prevents "Finanzamtes Finanzamt Berlin").
 */
export function normalizeTaxOfficeName(value: string): string {
  const trimmed = value.trim();
  const stripped = trimmed.replace(/^finanzamt(?:es|s)?\s+/i, "").trim();
  return stripped || trimmed;
}

/**
 * Normalizes a German register court name by stripping redundant leading
 * "Amtsgericht" / "AG" prefixes (prevents "AG Amtsgericht Charlottenburg").
 */
export function normalizeRegisterCourtName(value: string): string {
  const trimmed = value.trim();
  const stripped = trimmed.replace(/^(?:amtsgericht|ag\.?)\s+/i, "").trim();
  return stripped || trimmed;
}

/**
 * Normalizes charitable purposes before inserting after "Förderung " in BMF
 * wording (prevents "wegen Förderung Förderung von Kunst und Kultur").
 */
export function normalizeCharitablePurposes(value: string): string {
  const trimmed = value.trim();
  const stripped = trimmed.replace(/^(?:(?:zur|wegen)\s+)?f[öo]rderung\s+/i, "").trim();
  return stripped || trimmed;
}

/**
 * Keeps `StNr. <number>` together across line wraps using non-breaking spaces
 * so tax numbers never break mid-digit like `StNr. 00|7 250 12345`.
 */
export function formatNonBreakingTaxNumber(taxNumber: string): string {
  return `StNr.\u00A0${taxNumber.trim().replace(/\s+/g, "\u00A0")}`;
}
