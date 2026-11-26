import "server-only";

import { access } from "node:fs/promises";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { requireUser, UnauthorizedError } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { buildDownloadResponse, openReadStream, resolveSafePath } from "@/shared/files";
import { translateMessage } from "@/shared/i18n/translate-message";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { resolvePdfLang } from "@/shared/pdf/i18n";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { TreasurerReportDocument } from "../pdf/treasurer-report-document";
import { accountingPermissions } from "../permissions";
import { getTreasurerReportData } from "../queries/treasurer-report";
import { isValidTreasurerReportFile } from "../services/treasurer-report-file";
import { berlinToday } from "../utils";

/**
 * Genel Kurul Kassenbericht PDF indirme handler'ı (Q3).
 * Shared files pipeline (openReadStream, buildDownloadResponse) kullanır;
 * yetkisiz veya doğrudan açık URL handler yerine oturum + accounting.view denetler.
 */
export async function treasurerReportPdfHandler(request: Request): Promise<Response> {
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
    if (!isValidTreasurerReportFile(fileParam)) {
      return NextResponse.json(
        { ok: false, error: await translateMessage("common.errors.forbidden") },
        { status: 400 },
      );
    }
    try {
      await access(resolveSafePath(fileParam));
    } catch {
      return NextResponse.json(
        { ok: false, error: await translateMessage("common.errors.notFound") },
        { status: 404 },
      );
    }

    await writeAudit({
      userId: user.id,
      userLabel: buildUserLabel(user.name, user.email),
      action: "EXPORT",
      entity: "AccountingBooking",
      entityId: undefined,
      after: { report: "treasurer-report-pdf-download", storagePath: fileParam },
    });

    const rawName = url.searchParams.get("name") ?? "kassenbericht.pdf";
    const fileName = rawName.toLowerCase().endsWith(".pdf") ? rawName : "kassenbericht.pdf";
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

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "EXPORT",
    entity: "AccountingBooking",
    entityId: undefined,
    after: { report: "treasurer-report-pdf", year, lang },
  });

  const fileName = `kassenbericht-${year}-${lang}.pdf`;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer));
      controller.close();
    },
  });
  return buildDownloadResponse({
    stream,
    originalName: fileName,
    mimeType: "application/pdf",
    inline: false,
  });
}
