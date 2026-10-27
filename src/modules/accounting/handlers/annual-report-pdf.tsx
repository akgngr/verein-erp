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
import { AnnualReportDocument, type AnnualReportPdfData } from "../pdf/annual-report-document";
import { getAnnualReportData } from "../queries/get-income-expense-report";
import { berlinToday } from "../utils";

/** Content-Disposition için ASCII yedek dosya adı üretir. */
function asciiFileName(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").slice(0, 150);
}

/**
 * Yıllık Kasa Raporu (Kassenbericht) PDF (GET /api/accounting/reports/annual/
 * pdf?year=&lang=, § 11.8 md. 4): accounting.view; üretim audit EXPORT.
 */
export async function annualReportPdfHandler(request: Request): Promise<Response> {
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
  const yearRaw = url.searchParams.get("year") ?? "";
  const year = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : berlinToday().getUTCFullYear();
  const lang = resolvePdfLang(request);

  const reportData = await getAnnualReportData(year);

  const [profile, logoDataUri] = await Promise.all([
    getOrganizationProfile(),
    getOrganizationLogoDataUri(),
  ]);

  const data: AnnualReportPdfData = {
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
    year,
    accountBalances: reportData.accountBalances,
    incomeExpense: {
      rows: reportData.incomeExpense.rows,
      economicOperationIncomeCents: reportData.incomeExpense.economicOperationIncomeCents,
      economicOperationNotice: reportData.incomeExpense.economicOperationNotice,
    },
    projectRows: reportData.projectRows,
    missingReceiptCount: reportData.missingReceiptCount,
  };

  registerSharedPdfFonts();
  const buffer = await renderToBuffer(<AnnualReportDocument data={data} />);

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "AccountingBooking",
    entityId: null,
    after: { report: "annual-pdf", year },
  });

  const fileName = `kassenbericht-${year}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiFileName(fileName)}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
