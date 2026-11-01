import "server-only";

import { getDb } from "@/shared/db";

import { getOrganizationProfile } from "@/modules/organization/server";

import { countryCodeOf, parseFreeAddress, xrechnungIssues, type XInvoiceData, type XInvoiceIssue } from "./einvoice-out";
import { calculateInvoiceTotals } from "./invoice-calc";
import { getTaxSettings } from "./tax";

const iso = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

export type EInvoiceLoad =
  | { ok: true; data: XInvoiceData; invoiceId: string; number: string }
  | { ok: false; reason: "notFound" | "notIssued" }
  | { ok: false; reason: "incomplete"; issues: XInvoiceIssue[] };

/** XRechnung ve ZUGFeRD için ortak fatura verisi (kurum profili + fatura ayarları + cari). */
export async function loadEInvoiceData(id: string): Promise<EInvoiceLoad> {
  const db = getDb();
  const invoice = await db.accountingInvoice.findUnique({ where: { id }, include: { lines: { orderBy: { position: "asc" } }, contact: true } });
  if (!invoice) return { ok: false, reason: "notFound" };
  if (invoice.kind !== "INVOICE" || !invoice.number || invoice.status === "DRAFT") return { ok: false, reason: "notIssued" };
  const [profile, settings, tax] = await Promise.all([getOrganizationProfile(), db.accountingInvoiceSettings.findUnique({ where: { id: "singleton" } }), getTaxSettings(db)]);
  const totals = calculateInvoiceTotals(invoice.lines.map((line) => ({ quantity: Number(line.quantity), unitPriceCents: line.unitPriceCents, taxRate: line.taxRate })));
  const buyerAddress = parseFreeAddress(invoice.contact?.address ?? invoice.recipientAddress, invoice.recipientName);
  const data: XInvoiceData = {
    number: invoice.number,
    issueDate: iso(invoice.issueDate) as string,
    dueDate: iso(invoice.dueDate),
    serviceDate: invoice.serviceDate,
    buyerReference: invoice.buyerReference,
    currency: "EUR",
    seller: {
      name: profile.name,
      street: profile.street,
      postalCode: profile.postalCode,
      city: profile.city,
      countryCode: countryCodeOf(profile.country) ?? "DE",
      vatId: settings?.sellerVatId ?? null,
      taxNumber: profile.taxNumber,
      email: profile.email,
      phone: profile.phone,
      contactName: null,
    },
    buyer: { name: invoice.recipientName, ...buyerAddress, vatId: invoice.contact?.vatId ?? null, taxNumber: null, email: invoice.recipientEmail ?? invoice.contact?.email ?? null, phone: null, contactName: invoice.contact?.contactPerson ?? null },
    iban: settings?.iban ?? null,
    bic: settings?.bic ?? null,
    paymentTerms: invoice.dueDate ? null : settings ? `${settings.paymentDays} Tage netto` : null, // i18n-ignore: Rechnungstext
    note: invoice.taxNote,
    smallBusiness: tax.smallBusiness,
    lines: invoice.lines.map((line, index) => ({ position: line.position, description: line.description, quantity: Number(line.quantity), unit: line.unit, unitPriceCents: line.unitPriceCents, netCents: totals.lineTotals[index], taxRate: line.taxRate })),
    byRate: totals.byRate,
    netCents: totals.netCents,
    taxCents: totals.taxCents,
    grossCents: totals.grossCents,
    paidCents: invoice.paidCents,
  };
  const issues = xrechnungIssues(data);
  if (issues.length) return { ok: false, reason: "incomplete", issues };
  return { ok: true, data, invoiceId: invoice.id, number: invoice.number };
}
