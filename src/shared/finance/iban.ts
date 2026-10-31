/** IBAN doğrulama (ISO 13616, mod 97) ve maskeleme — saf yardımcılar. */
export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const digits = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** "DE89 •••• •••• 3000" — ekranda tam IBAN yerine gösterilir. */
export function maskIban(value: string): string {
  const iban = normalizeIban(value);
  return iban.length < 8 ? "••••" : `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}`;
}
