import { CONFIRMATION_RETENTION_YEARS } from "../constants";

/** Bildirim nüsha saklama süresinin sonu (31.12.issuedYear + 10 yıl — § 50 Abs. 7 EStDV). */
export function retentionEndDate(issuedAt: Date): Date {
  return new Date(Date.UTC(issuedAt.getUTCFullYear() + CONFIRMATION_RETENTION_YEARS, 11, 31));
}

export type RecipientAddressInput = {
  name: string | null | undefined;
  street: string | null | undefined;
  postalCode: string | null | undefined;
  city: string | null | undefined;
  country: string | null | undefined;
};

/**
 * Validates that a confirmation recipient (donor or member) has complete legal address fields.
 * Returns normalized values or the list of missing fields.
 */
export function validateRecipientAddress(input: RecipientAddressInput):
  | { ok: true; name: string; street: string; postalCode: string; city: string; country: string }
  | { ok: false; missing: string[] } {
  const missing: string[] = [];
  const name = input.name?.trim() || "";
  const street = input.street?.trim() || "";
  const postalCode = input.postalCode?.trim() || "";
  const city = input.city?.trim() || "";
  if (!name) missing.push("alıcı adı");
  if (!street) missing.push("Straße");
  if (!postalCode) missing.push("PLZ");
  if (!city) missing.push("şehir");
  if (missing.length > 0) return { ok: false, missing };
  return {
    ok: true,
    name,
    street,
    postalCode,
    city,
    country: input.country?.trim() || "Deutschland",
  };
}

/**
 * Validates that organization profile & exemption notice readiness checks from
 * `getReadiness()` are complete and valid (§ 63 Abs. 5 AO) before generating a
 * § 50 Abs. 4 Satz 1 Nr. 2 EStDV simplified proof PDF.
 */
export function checkSimplifiedProofReadiness(
  items: Array<{ key: string; ok: boolean; label: string; fixHref: string | null }>,
): { ok: true } | { ok: false; missing: string[]; fixHref: string } {
  const requiredKeys = new Set(["organization", "validity"]);
  const blockers = items.filter((item) => requiredKeys.has(item.key) && !item.ok);
  const foundKeys = new Set(items.map((item) => item.key));
  if (
    blockers.length > 0 ||
    !foundKeys.has("organization") ||
    !foundKeys.has("validity")
  ) {
    return {
      ok: false,
      missing: blockers.map((item) => item.label),
      fixHref: blockers.find((item) => item.fixHref)?.fixHref ?? "/ayarlar/dernek",
    };
  }
  return { ok: true };
}
