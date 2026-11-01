import "server-only";

import { NextResponse } from "next/server";

import { getDb } from "@/shared/db";
import { translateMessage } from "@/shared/i18n/translate-message";
import { resolvePdfLang } from "@/shared/pdf/i18n";

import { DOCUMENT_STRINGS } from "../pdf/document-strings";
import { DunningDocument } from "../pdf/dunning-document";
import { authorizePdf, loadLetterhead, pdfResponse } from "./pdf-support";

/** GET /api/accounting/dunnings/[id]/pdf — ihtar mektubu (ACC-6). */
export async function dunningPdfHandler(request: Request, id: string): Promise<Response> {
  const user = await authorizePdf();
  if (user instanceof Response) return user;
  const db = getDb();
  const dunning = await db.accountingDunning.findUnique({ where: { id }, include: { invoice: true } });
  if (!dunning || !dunning.invoice.number) {
    return NextResponse.json({ ok: false, error: await translateMessage("accounting.dunning.errors.notFound") }, { status: 404 });
  }
  const lang = resolvePdfLang(request);
  const [letterhead, settings] = await Promise.all([loadLetterhead(), db.accountingInvoiceSettings.findUnique({ where: { id: "singleton" }, select: { bankDetails: true } })]);
  const invoice = dunning.invoice;
  return pdfResponse({
    user,
    document: (
      <DunningDocument
        data={{
          organization: letterhead,
          lang,
          strings: DOCUMENT_STRINGS[lang],
          recipientName: invoice.recipientName,
          recipientAddress: invoice.recipientAddress,
          invoiceNumber: invoice.number as string,
          invoiceDate: invoice.issueDate,
          dueDate: invoice.dueDate ?? invoice.issueDate,
          level: dunning.level,
          dunningDate: dunning.dunningDate,
          newDueDate: dunning.newDueDate,
          openCents: dunning.openCents,
          feeCents: dunning.feeCents,
          interestCents: dunning.interestCents,
          interestRate: Number(dunning.interestRate),
          flatFeeCents: dunning.flatFeeCents,
          bankDetails: settings?.bankDetails ?? null,
        }}
      />
    ),
    fileName: `mahnung-${dunning.level}-${invoice.number}.pdf`,
    audit: { entity: "AccountingDunning", entityId: dunning.id, after: { report: "dunning-pdf", level: dunning.level } },
  });
}
