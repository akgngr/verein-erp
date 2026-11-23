import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { requireUser, UnauthorizedError } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { buildDownloadResponse, makeStoredName, openReadStream, saveFile } from "@/shared/files";
import { translateMessage } from "@/shared/i18n/translate-message";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { resolvePdfLang } from "@/shared/pdf/i18n";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { TreasurerReportDocument } from "../pdf/treasurer-report-document";
import { accountingPermissions } from "../permissions";
import { getTreasurerReportData } from "../queries/treasurer-report";
import { berlinToday } from "../utils";

/**
 * Genel Kurul Kassenbericht PDF indirme handler'ı (Q3).
 * Shared files pipeline (openReadStream, buildDownloadResponse, saveFile) kullanır;
 * doğrudan açık URL yerine oturum + accounting.view denetler ve audit kaydı düşer.
 */
export async function treasurerReportHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: await translateMessage("common.errors.sessionExpired") },
        { status: 401 },
      );
    }
    throw error;
  }

  if (!can(user.role, accountingPermissions, "view")) {
    return NextResponse.json(
      { ok: false, error: await translateMessage("common.errors.forbidden") },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const fileParam = url.searchParams.get("file");

  if (fileParam) {
    const fileName = url.searchParams.get("name") ?? "kassenbericht.pdf";
    return buildDownloadResponse({
      stream: openReadStream(fileParam),
      originalName: fileName,
      mimeType: "application/pdf",
      inline: false,
    });
  }

  const yearRaw = url.searchParams.get("year") ?? "";
  const year = /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : berlinToday().getUTCFullYear();
  const lang = resolvePdfLang(request);

  const [report, profile, logoDataUri] = await Promise.all([
    getTreasurerReportData(year),
    getOrganizationProfile(),
    getOrganizationLogoDataUri(),
  ]);

  registerSharedPdfFonts();
  const buffer = await renderToBuffer(
    <TreasurerReportDocument
      data={{
        organization: { ...profile, logoDataUri },
        lang,
        report,
      }}
    />,
  );

  const storedName = makeStoredName("pdf");
  const storagePath = ["accounting", "reports", String(year), storedName].join("/");
  await saveFile(storagePath, new Uint8Array(buffer));

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "AccountingBooking",
    entityId: undefined,
    after: { report: "treasurer-report-pdf", year, lang, storagePath },
  });

  const fileName = `kassenbericht-${year}-${lang}.pdf`;
  return buildDownloadResponse({
    stream: openReadStream(storagePath),
    originalName: fileName,
    mimeType: "application/pdf",
    inline: false,
  });
}
