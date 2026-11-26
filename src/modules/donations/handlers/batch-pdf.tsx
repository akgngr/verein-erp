import "server-only";

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { resolveSafePath } from "@/shared/files";
import { translateMessage } from "@/shared/i18n/translate-message";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { BATCH_PDF_MAX_IDS } from "../constants";
import { ConfirmationDocument } from "../pdf/confirmation-document";
import { donationsPermissions } from "../permissions";
import { storedSnapshotToPdfData } from "./snapshot-pdf";

/** ASCII güvenli dosya adı. */
function asciiFileName(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").slice(0, 150);
}

/**
 * Toplu yazdırma (§ 13): ?ids=a,b,c (max 100); yalnızca aktif (`ISSUED`)
 * bildirimlerin depolanmış PDF'leri SHA-256 bütünlüğü doğrulanarak `pdf-lib`
 * ile tek çok sayfalı PDF'te birleştirilir. Her bağışçı kendi bağımsız sayfa
 * numaralandırmasını ("Seite 1 von 1" / "Seite 1 von 2") korur.
 */
export async function batchPdfHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, donationsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }

  const idsParam = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean).slice(0, BATCH_PDF_MAX_IDS);
  if (ids.length === 0) {
    return NextResponse.json({ ok: false, error: await translateMessage("donations.errors.noConfirmationSelected") }, { status: 400 });
  }

  const db = getDb();
  const confirmations = await db.zuwendungConfirmation.findMany({
    where: { id: { in: ids }, status: "ISSUED" },
    include: { items: { orderBy: { position: "asc" } } },
    orderBy: [{ year: "asc" }, { sequence: "asc" }],
  });
  if (confirmations.length === 0) {
    return NextResponse.json({ ok: false, error: await translateMessage("donations.errors.confirmationNotFound2") }, { status: 404 });
  }

  const mergedPdf = await PDFDocument.create();
  mergedPdf.setTitle("Zuwendungsbestätigungen");

  for (const confirmation of confirmations) {
    let singleBytes: Uint8Array;
    if (confirmation.pdfStoragePath && confirmation.pdfSha256) {
      const absolutePath = resolveSafePath(confirmation.pdfStoragePath);
      const fileBuffer = await readFile(absolutePath);
      const actualHash = createHash("sha256").update(fileBuffer).digest("hex");
      if (actualHash !== confirmation.pdfSha256) {
        await writeAudit({
          userId: user.id,
          userLabel: buildUserLabel(user.name, user.email),
          action: "PDF_INTEGRITY_ERROR",
          entity: "ZuwendungConfirmation",
          entityId: confirmation.id,
          before: { confirmationNumber: confirmation.confirmationNumber, expectedSha256: confirmation.pdfSha256 },
          after: { actualSha256: actualHash },
        });
        return NextResponse.json(
          { ok: false, error: await translateMessage("donations.errors.pdfIntegrity") },
          { status: 500 },
        );
      }
      singleBytes = new Uint8Array(fileBuffer);
    } else {
      const pdfData = await storedSnapshotToPdfData(
        confirmation,
        confirmation.items.map((item) => ({
          position: item.position,
          itemType: item.itemType,
          sourceId: item.sourceId,
          itemDate: item.itemDate,
          amountCents: Number(item.amount.mul(100).toFixed(0)),
          label: item.label,
          waived: item.waived,
        })),
      );
      registerSharedPdfFonts();
      singleBytes = new Uint8Array(await renderToBuffer(<ConfirmationDocument data={pdfData} />));
    }

    const srcDoc = await PDFDocument.load(singleBytes);
    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    for (const page of copiedPages) {
      mergedPdf.addPage(page);
    }
  }

  const mergedBytes = await mergedPdf.save();

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "PDF_BATCH_DOWNLOAD",
    entity: "ZuwendungConfirmation",
    entityId: null,
    after: { count: confirmations.length },
  });

  const today = new Date().toISOString().slice(0, 10);
  const fileName = `zuwendungsbestaetigungen-${today}.pdf`;
  return new Response(new Uint8Array(mergedBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiFileName(fileName)}"`,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
