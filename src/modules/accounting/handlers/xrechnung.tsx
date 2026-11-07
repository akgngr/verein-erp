import "server-only";

import { getTranslations } from "next-intl/server";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { resolvePdfLang } from "@/shared/pdf/i18n";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { getOrganizationProfile } from "@/modules/organization/server";

import { DOCUMENT_STRINGS } from "../pdf/document-strings";
import { InvoiceDocument } from "../pdf/invoice-document";
import { accountingPermissions } from "../permissions";
import { getInvoice, getInvoiceSettings } from "../queries/invoices";
import { buildCiiInvoice } from "../services/einvoice-cii";
import { loadEInvoiceData, type EInvoiceLoad } from "../services/einvoice-data";
import { buildXRechnungUbl } from "../services/einvoice-out";
import { toZugferdPdf } from "../services/zugferd-pdf";
import { loadLetterhead, pdfResponse } from "./pdf-support";

async function authorize() {
  try {
    const user = await requireUser();
    if (!can(user.role, accountingPermissions, "view")) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
    return user;
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
}

/** Yükleme hatası → çevrilmiş JSON (eksik alanlar nereden düzeltileceğiyle listelenir). */
async function failure(load: Exclude<EInvoiceLoad, { ok: true }>): Promise<Response> {
  if (load.reason === "notFound") return NextResponse.json({ ok: false, error: await translateMessage("accounting.invoices.errors.notFound") }, { status: 404 });
  if (load.reason === "notIssued") return NextResponse.json({ ok: false, error: await translateMessage("accounting.invoices.xrechnung.notIssued") }, { status: 409 });
  if (load.reason !== "incomplete") return NextResponse.json({ ok: false }, { status: 500 });
  const errors = load.issues.filter((issue) => issue.severity === "error");
  // Kural kodları tire içerir (BR-DE-3); ortak anahtar algılayıcısı yerine ad alanından doğrudan çevrilir.
  const tRules = await getTranslations("accounting.einvoice.rules");
  const labels = errors.map((issue) => `${issue.rule}: ${tRules.has(issue.rule as never) ? tRules(issue.rule as never) : issue.rule}`);
  return NextResponse.json({ ok: false, error: `${await translateMessage("accounting.invoices.xrechnung.incomplete")} ${labels.join("; ")}`, issues: errors.map((issue) => issue.rule) }, { status: 422 });
}

/** GET /api/accounting/invoices/[id]/xrechnung — XRechnung 3.0 (UBL). */
export async function xrechnungHandler(_request: Request, id: string): Promise<Response> {
  const user = await authorize();
  if (user instanceof Response) return user;
  const load = await loadEInvoiceData(id);
  if (!load.ok) return failure(load);
  await writeAudit({ userId: user.id, userLabel: buildUserLabel(user.name, user.email), action: "EXPORT", entity: "AccountingInvoice", entityId: load.invoiceId, after: { report: "xrechnung", number: load.number } });
  return new Response(buildXRechnungUbl(load.data), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="XRechnung_${load.number.replace(/[^\w.-]/g, "_")}.xml"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/** GET /api/accounting/invoices/[id]/zugferd — fatura PDF'i + gömülü CII (Factur-X / ZUGFeRD, EN 16931). */
export async function zugferdHandler(request: Request, id: string): Promise<Response> {
  const user = await authorize();
  if (user instanceof Response) return user;
  const load = await loadEInvoiceData(id);
  if (!load.ok) return failure(load);
  const invoice = await getInvoice(id);
  if (!invoice) return failure({ ok: false, reason: "notFound" });
  const lang = resolvePdfLang(request);
  const [letterhead, profile, settings] = await Promise.all([loadLetterhead(), getOrganizationProfile(), getInvoiceSettings()]);
  const xml = buildCiiInvoice(load.data);
  return pdfResponse({
    user,
    document: <InvoiceDocument data={{ organization: { ...letterhead, email: profile.email, phone: profile.phone, website: profile.website }, lang, strings: DOCUMENT_STRINGS[lang], invoice, settings }} />,
    fileName: `rechnung-${load.number}-zugferd.pdf`,
    audit: { entity: "AccountingInvoice", entityId: load.invoiceId, after: { report: "zugferd", number: load.number } },
    transform: (pdf) => toZugferdPdf(pdf, xml, { title: `Rechnung ${load.number}`, author: profile.name, created: new Date() }), // i18n-ignore: PDF-Metadaten
  });
}
