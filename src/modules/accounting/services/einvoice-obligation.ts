/**
 * EI-4 e-fatura zorunluluğu (Wachstumschancengesetz, § 14 UStG, § 27 Abs. 38 UStG). Saf fonksiyonlar.
 * KARAR: uygulama yalnızca HATIRLATIR; hukuki karar kullanıcının ve vergi danışmanınındır.
 *  - 2025–2026: tüm yurt içi B2B faturalar kâğıt/PDF olabilir (alıcı onayıyla); e-fatura alabilmek zorunlu.
 *  - 2027: önceki yıl cirosu > 800.000 € ise e-fatura kesmek zorunlu.
 *  - 2028'den itibaren: tüm işletmeler.
 *  - İstisnalar: özel kişiye (B2C) faturalar, ≤ 250 € brüt (Kleinbetragsrechnung, § 33 UStDV).
 *  - Kamu (B2G): e-fatura (XRechnung) ve Leitweg-ID zaten zorunlu (E-Rechnungsverordnung).
 *  - Kleinunternehmer (§ 19): kesme yükümlülüğünden muafiyet (§ 34a UStDV) — "voluntary" sayılır.
 */
export type EInvoiceMode = "AUTO" | "ALWAYS" | "NEVER";
export type RecipientType = "B2B" | "B2C" | "PUBLIC";

export const REVENUE_THRESHOLD_2027_CENTS = 80_000_000;
export const SMALL_INVOICE_LIMIT_CENTS = 25_000;

export type IssuerObligation = { required: boolean; reason: "always" | "never" | "smallBusiness" | "from2028" | "revenue2027" | "below2027" | "unknownRevenue2027" | "transition" };

/** Kurumun belirtilen yılda e-fatura KESME zorunluluğu. */
export function issuerObligation(input: { mode: EInvoiceMode; smallBusiness: boolean; previousYearRevenueCents: number | null; year: number }): IssuerObligation {
  if (input.mode === "ALWAYS") return { required: true, reason: "always" };
  if (input.mode === "NEVER") return { required: false, reason: "never" };
  if (input.smallBusiness) return { required: false, reason: "smallBusiness" };
  if (input.year >= 2028) return { required: true, reason: "from2028" };
  if (input.year === 2027) {
    if (input.previousYearRevenueCents === null) return { required: false, reason: "unknownRevenue2027" };
    return input.previousYearRevenueCents > REVENUE_THRESHOLD_2027_CENTS ? { required: true, reason: "revenue2027" } : { required: false, reason: "below2027" };
  }
  return { required: false, reason: "transition" };
}

export type InvoiceRequirement = { level: "required" | "recommended" | "notRequired"; reason: "public" | "b2c" | "small" | "b2bRequired" | "b2bVoluntary" };

/** Tek fatura için e-fatura gerekliliği. */
export function invoiceRequirement(input: { recipientType: RecipientType; grossCents: number; issuer: IssuerObligation }): InvoiceRequirement {
  if (input.recipientType === "PUBLIC") return { level: "required", reason: "public" };
  if (input.recipientType === "B2C") return { level: "notRequired", reason: "b2c" };
  if (Math.abs(input.grossCents) <= SMALL_INVOICE_LIMIT_CENTS) return { level: "notRequired", reason: "small" };
  return input.issuer.required ? { level: "required", reason: "b2bRequired" } : { level: "recommended", reason: "b2bVoluntary" };
}

/** Leitweg-ID biçimi: Grobadressierung (2–12 rakam) [-Feinadressierung (≤30 harf/rakam)] -Prüfziffer (2 rakam). */
export function isLeitwegId(value: string): boolean {
  return /^\d{2,12}(-[A-Z0-9]{1,30})?-\d{2}$/i.test(value.trim());
}

/** Kamu alıcısına kesilecek faturada Leitweg-ID (BuyerReference) zorunludur. */
export function missingLeitweg(input: { recipientType: RecipientType; buyerReference: string | null; contactLeitwegId: string | null }): boolean {
  if (input.recipientType !== "PUBLIC") return false;
  const reference = (input.buyerReference || input.contactLeitwegId || "").trim();
  return !reference || !isLeitwegId(reference);
}

export type ReadinessKey = "sellerName" | "sellerAddress" | "sellerTaxId" | "sellerContact" | "iban";

/** 2027/2028 hazırlık kontrolü: satıcı bilgileri eksiksiz mi? */
export function readinessChecks(input: { name: string | null; street: string | null; postalCode: string | null; city: string | null; vatId: string | null; taxNumber: string | null; email: string | null; phone: string | null; iban: string | null }): Array<{ key: ReadinessKey; ok: boolean }> {
  return [
    { key: "sellerName", ok: Boolean(input.name?.trim()) },
    { key: "sellerAddress", ok: Boolean(input.street?.trim() && input.postalCode?.trim() && input.city?.trim()) },
    { key: "sellerTaxId", ok: Boolean(input.vatId?.trim() || input.taxNumber?.trim()) },
    { key: "sellerContact", ok: Boolean(input.email?.trim() && input.phone?.trim()) },
    { key: "iban", ok: Boolean(input.iban?.trim()) },
  ];
}
