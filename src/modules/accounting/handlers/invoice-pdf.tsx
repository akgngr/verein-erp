import "server-only";

import { NextResponse } from "next/server";

import { translateMessage } from "@/shared/i18n/translate-message";
import { resolvePdfLang } from "@/shared/pdf/i18n";

import { getOrganizationProfile } from "@/modules/organization/server";

import { DOCUMENT_STRINGS } from "../pdf/document-strings";
import { InvoiceDocument } from "../pdf/invoice-document";
import { getInvoice, getInvoiceSettings } from "../queries/invoices";
import { authorizePdf, loadLetterhead, pdfResponse } from "./pdf-support";

/** GET /api/accounting/invoices/[id]/pdf — fatura / proforma (taslakta "ENTWURF"). */
export async function invoicePdfHandler(request: Request, id: string): Promise<Response> {
  const user = await authorizePdf();
  if (user instanceof Response) return user;
  const invoice = await getInvoice(id);
  if (!invoice) {
    return NextResponse.json({ ok: false, error: await translateMessage("accounting.invoices.errors.notFound") }, { status: 404 });
  }
  const lang = resolvePdfLang(request);
  const [letterhead, profile, settings] = await Promise.all([loadLetterhead(), getOrganizationProfile(), getInvoiceSettings()]);
  const prefix = invoice.kind === "PROFORMA" ? "proforma" : "rechnung";
  return pdfResponse({
    user,
    document: (
      <InvoiceDocument
        data={{
          organization: { ...letterhead, email: profile.email, phone: profile.phone, website: profile.website },
          lang,
          strings: DOCUMENT_STRINGS[lang],
          invoice,
          settings,
        }}
      />
    ),
    fileName: `${prefix}-${invoice.number ?? "entwurf"}.pdf`,
    audit: { entity: "AccountingInvoice", entityId: invoice.id, after: { report: "invoice-pdf", number: invoice.number } },
  });
}
