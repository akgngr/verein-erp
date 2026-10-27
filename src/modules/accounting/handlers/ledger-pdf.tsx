import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { can } from "@/shared/permissions/define";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { resolvePdfLang } from "@/shared/pdf/i18n";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";

import { accountingPermissions } from "../permissions";
import { ACCOUNTING_STRINGS } from "../pdf/strings";
import { LedgerDocument, type LedgerPdfData } from "../pdf/ledger-document";
import { getLedgerReport } from "../queries/get-ledger";
import { berlinToday } from "../utils";

/** Content-Disposition için ASCII yedek dosya adı üretir. */
function asciiFileName(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").slice(0, 150);
}

/**
 * Kasa defteri PDF (GET /api/accounting/reports/ledger/pdf?account=&from=&to=&lang=,
 * § 11.8 md. 2): accounting.view; inline disposition; üretim audit EXPORT'a yazılır
 * (§ 13: "PDF generation of Kassenbuch and Kassenbericht IS logged").
 */
export async function ledgerPdfHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, accountingPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get("account") ?? "";
  const year = berlinToday().getUTCFullYear();
  const from = url.searchParams.get("from") ?? `${year}-01-01`;
  const to = url.searchParams.get("to") ?? `${year}-12-31`;
  if (!accountId) {
    return NextResponse.json({ ok: false, error: "Hesap seçilmedi." }, { status: 400 });
  }

  const lang = resolvePdfLang(request);
  const report = await getLedgerReport(accountId, from, to);

  const [profile, logoDataUri] = await Promise.all([
    getOrganizationProfile(),
    getOrganizationLogoDataUri(),
  ]);

  const data: LedgerPdfData = {
    organization: {
      name: profile.name,
      street: profile.street,
      postalCode: profile.postalCode,
      city: profile.city,
      registerCourt: profile.registerCourt,
      registerNumber: profile.registerNumber,
      taxNumber: profile.taxNumber,
      taxOffice: profile.taxOffice,
      exemptionNoticeDate: profile.exemptionNoticeDate,
      exemptionNoticePeriod: profile.exemptionNoticePeriod,
      logoDataUri,
    },
    lang,
    strings: ACCOUNTING_STRINGS[lang],
    report,
  };

  registerSharedPdfFonts();
  const buffer = await renderToBuffer(<LedgerDocument data={data} />);

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "AccountingBooking",
    entityId: null,
    after: { report: "ledger-pdf", account: report.accountName, from, to },
  });

  const fileName = `kassenbuch-${report.from}_${report.to}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiFileName(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
