/**
 * Para yardımcıları (Faz 4, 5. ve 8. bölümler).
 *
 * KARAR: Tüm para aritmetiği INTEGER CENT üzerinden yapılır; Decimal(12,2)
 * kolonlar yalnızca kalıcılık içindir. Float kullanılmaz (kuruş kayması yok).
 *
 * formatMoney: UI için (varsayılan tr-TR, "1.234,56 ₺" tarzı). PDF'ler için
 * shared/pdf/format.ts#formatPdfMoney kullanılır (EUR, lang'e göre de-DE/tr-TR).
 */

/** "12,50" / "12.50" / "1.234,56" / "1234.56" → cent. 3+ ondalık reddedilir. */
export function toCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  // Yalnızca rakam, ayırıcı ve işaret kabul edilir.
  if (!/^-?\d[\d.,]*$/.test(trimmed)) return null;

  let normalized: string;
  if (trimmed.includes(",") && trimmed.includes(".")) {
    // Her ikisi de varsa: son görünen ayırıcı ondalıktır.
    const lastComma = trimmed.lastIndexOf(",");
    const lastDot = trimmed.lastIndexOf(".");
    normalized = lastComma > lastDot
      ? trimmed.replace(/\./g, "").replace(",", ".")
      : trimmed.replace(/,/g, "");
  } else if (trimmed.includes(",")) {
    const parts = trimmed.split(",");
    // "1,234" biçimindeki binlik ayıracı ile "12,50" ondalığını ayırt et:
    // son grup 3 hane ve öncesinde ayırıcı varsa binlik ayıracı sayılır.
    normalized = parts.length > 2 || parts[parts.length - 1].length === 3
      ? trimmed.replace(/,/g, "")
      : trimmed.replace(",", ".");
  } else {
    normalized = trimmed;
  }

  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  const cents = Math.round(value * 100);
  if (cents > 999_999_999 || cents < -999_999_999) return null;
  return cents;
}

/** Cent → ondalık string ("1234.56"; Prisma Decimal girişi için). */
export function centsToDecimalString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}

/** Cent → görüntüleme metni (UI; varsayılan tr-TR). */
export function formatMoney(cents: number, locale: "tr-TR" | "de-DE" = "tr-TR"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
