/** YYYY-MM-DD string'ini UTC gece yarısı Date'e çevirir; geçersizse null. */
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Date → YYYY-MM-DD (formlar için). */
export function formatDateOnly(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function personName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

/** IBAN'ı boşluksuz, büyük harfle saklar. */
export function normalizeIban(value: string | null | undefined): string | null {
  if (!value) return null;
  const compact = value.replace(/\s+/g, "").toUpperCase();
  return compact || null;
}

/** IBAN kontrol basamağı (ISO 13616, mod 97). */
export function isValidIban(value: string): boolean {
  const iban = value.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}
