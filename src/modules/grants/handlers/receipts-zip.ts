import "server-only";

import { NextResponse } from "next/server";

import { accountingPermissions, listProjectBookingFiles } from "@/modules/accounting/server";
import { requireUser, UnauthorizedError } from "@/modules/auth/server";
import { readFile } from "@/shared/files";
import { buildZipArchive, type ZipEntry } from "@/shared/files/zip";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";

import { grantsPermissions } from "../permissions";
import { buildReport, getGrant } from "../services/grants";

const sanitizeFilePart = (value: string) =>
  value.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "file";

const csvCell = (value: string | number | null | undefined) => {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
};

/**
 * GET /api/grants/[id]/receipts-zip — Verwendungsnachweis belge paketi (Belegliste CSV + tüm fiş ekleri).
 */
export async function exportReceiptsZipHandler(
  _request: Request,
  ctx: { id: string },
): Promise<Response> {
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

  if (
    !can(user.role, grantsPermissions, "view") ||
    !can(user.role, accountingPermissions, "view")
  ) {
    return NextResponse.json(
      { ok: false, error: await translateMessage("common.errors.forbidden") },
      { status: 403 },
    );
  }

  const grant = await getGrant(ctx.id);
  if (!grant) {
    return NextResponse.json(
      { ok: false, error: await translateMessage("grants.errors.notFound") },
      { status: 404 },
    );
  }

  const otherLabel = await translateMessage("grants.otherLine");
  const report = await buildReport(grant, otherLabel);

  const csvRows = [
    ["Date", "BookingNumber", "BudgetLine", "Counterparty", "Description", "AmountEUR", "FileCount"]
      .map(csvCell)
      .join(";"),
    ...report.vouchers.map((v) =>
      [
        v.date,
        v.bookingNumber,
        v.lineLabel,
        v.counterparty ?? "",
        v.description,
        (v.counted / 100).toFixed(2).replace(".", ","),
        v.fileCount,
      ]
        .map(csvCell)
        .join(";"),
    ),
  ];

  const entries: ZipEntry[] = [
    {
      name: "belegliste.csv",
      data: Buffer.from(`\uFEFF${csvRows.join("\r\n")}`, "utf8"),
    },
  ];

  if (grant.projectId) {
    const files = await listProjectBookingFiles(
      grant.projectId,
      new Date(`${grant.periodStart}T00:00:00Z`),
      new Date(`${grant.periodEnd}T00:00:00Z`),
    );
    const usedNames = new Set<string>();
    for (const file of files) {
      try {
        const buffer = await readFile(file.storagePath);
        const base = `${sanitizeFilePart(file.bookingNumber)}_${sanitizeFilePart(file.originalName)}`;
        let candidate = `belege/${base}`;
        let n = 2;
        while (usedNames.has(candidate)) {
          candidate = `belege/${n}_${base}`;
          n += 1;
        }
        usedNames.add(candidate);
        entries.push({ name: candidate, data: buffer });
      } catch {
        // Missing file on disk: skip gracefully so remaining receipts still export
      }
    }
  }

  const zipBuffer = buildZipArchive(entries);
  const slug = sanitizeFilePart(grant.fileNumber || grant.name).slice(0, 60);
  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="verwendungsnachweis-belege-${slug}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
