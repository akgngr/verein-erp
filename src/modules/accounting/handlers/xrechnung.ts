import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { getOrganizationProfile } from "@/modules/organization/server";

import { accountingPermissions } from "../permissions";
import { buildXRechnungUbl, countryCodeOf, parseFreeAddress, xrechnungIssues, type XInvoiceData } from "../services/einvoice-out";
import { calculateInvoiceTotals } from "../services/invoice-calc";
import { getTaxSettings } from "../services/tax";

const iso = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

/**
 * GET /api/accounting/invoices/[id]/xrechnung — XRechnung 3.0 (UBL). Yalnızca kesinleşmiş
 * faturalar; zorunlu satıcı/alıcı alanları eksikse 422 + eksik listesi (çevrilmiş).
 */
export async function xrechnungHandler(_request: Request, id: string): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
  if (!can(user.role, accountingPermissions, "view")) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });

  const db = getDb();
  const invoice = await db.accountingInvoice.findUnique({ where: { id }, include: { lines: { orderBy: { position: "asc" } }, contact: true } });
  if (!invoice) return NextResponse.json({ ok: false, error: await translateMessage("accounting.invoices.errors.notFound") }, { status: 404 });
  if (invoice.kind !== "INVOICE" || !invoice.number || invoice.status === "DRAFT") {
    return NextResponse.json({ ok: false, error: await translateMessage("accounting.invoices.xrechnung.notIssued") }, { status: 409 });
  }
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
  if (issues.length) {
    const labels = await Promise.all(issues.map((issue) => translateMessage(`accounting.invoices.xrechnung.issues.${issue}`)));
    return NextResponse.json({ ok: false, error: `${await translateMessage("accounting.invoices.xrechnung.incomplete")} ${labels.join(", ")}`, issues }, { status: 422 });
  }
  await writeAudit({ userId: user.id, userLabel: buildUserLabel(user.name, user.email), action: "EXPORT", entity: "AccountingInvoice", entityId: invoice.id, after: { report: "xrechnung", number: invoice.number } });
  return new Response(buildXRechnungUbl(data), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="XRechnung_${invoice.number.replace(/[^\w.-]/g, "_")}.xml"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
