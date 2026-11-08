import "server-only";

import { getDb } from "@/shared/db";

import { getOrganizationProfile } from "@/modules/organization/server";

import { invoiceRequirement, issuerObligation, missingLeitweg, readinessChecks, type EInvoiceMode, type InvoiceRequirement, type IssuerObligation, type RecipientType } from "./einvoice-obligation";

export type EInvoiceSettings = { mode: EInvoiceMode; previousYearRevenueCents: number | null; smallBusiness: boolean };

export async function getEInvoiceSettings(): Promise<EInvoiceSettings> {
  const row = await getDb().accountingSettings.findUnique({ where: { id: "singleton" }, select: { einvoiceMode: true, previousYearRevenueCents: true, smallBusiness: true } });
  const mode = row?.einvoiceMode === "ALWAYS" || row?.einvoiceMode === "NEVER" ? row.einvoiceMode : "AUTO";
  return { mode, previousYearRevenueCents: row?.previousYearRevenueCents ?? null, smallBusiness: row?.smallBusiness ?? false };
}

/** Kurumun verilen yıldaki e-fatura kesme zorunluluğu. */
export async function getIssuerObligation(year: number): Promise<IssuerObligation> {
  const settings = await getEInvoiceSettings();
  return issuerObligation({ ...settings, year });
}

/** Ayarlar ekranı: zorunluluk durumu (bu yıl ve gelecek yıl) + satıcı bilgisi hazırlık listesi. */
export async function getEInvoiceStatus(today = new Date()) {
  const year = today.getUTCFullYear();
  const [settings, profile, invoiceSettings] = await Promise.all([
    getEInvoiceSettings(),
    getOrganizationProfile(),
    getDb().accountingInvoiceSettings.findUnique({ where: { id: "singleton" }, select: { sellerVatId: true, iban: true } }),
  ]);
  return {
    settings,
    thisYear: { year, obligation: issuerObligation({ ...settings, year }) },
    nextYear: { year: year + 1, obligation: issuerObligation({ ...settings, year: year + 1 }) },
    readiness: readinessChecks({
      name: profile.name,
      street: profile.street,
      postalCode: profile.postalCode,
      city: profile.city,
      vatId: invoiceSettings?.sellerVatId ?? null,
      taxNumber: profile.taxNumber,
      email: profile.email,
      phone: profile.phone,
      iban: invoiceSettings?.iban ?? null,
    }),
  };
}

/** Fatura ekranı: bu faturanın e-fatura gerekliliği (cari seçili değilse null — alıcı türü bilinmez). */
export async function getInvoiceRequirement(invoiceId: string): Promise<(InvoiceRequirement & { recipientType: RecipientType; missingLeitweg: boolean }) | null> {
  const invoice = await getDb().accountingInvoice.findUnique({ where: { id: invoiceId }, select: { kind: true, grossCents: true, issueDate: true, buyerReference: true, contact: { select: { einvoiceType: true, leitwegId: true } } } });
  if (!invoice?.contact || (invoice.kind !== "INVOICE" && invoice.kind !== "CREDIT_NOTE")) return null;
  const issuer = await getIssuerObligation(invoice.issueDate.getUTCFullYear());
  const recipientType = invoice.contact.einvoiceType;
  return {
    ...invoiceRequirement({ recipientType, grossCents: invoice.grossCents, issuer }),
    recipientType,
    missingLeitweg: missingLeitweg({ recipientType, buyerReference: invoice.buyerReference, contactLeitwegId: invoice.contact.leitwegId }),
  };
}
