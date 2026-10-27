import "server-only";

import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { stat, readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { resolveSafePath } from "@/shared/files";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { donationsPermissions } from "../permissions";

/**
 * Depolanmış bildirim PDF'inin İNDİRİLMESİ (§ 13): STORED BYTES döner — yeniden
 * render YAPILMAZ. SHA-256 pdfSha256 ile doğrulanır; uyuşmazlıkta 500 + net
 * mesaj + PDF_INTEGRITY_ERROR denetim kaydı. Cache-Control: private, no-store.
 */
export async function downloadConfirmationPdfHandler(
  _request: Request,
  ctx: { id: string },
): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, donationsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const db = getDb();
  const confirmation = await db.zuwendungConfirmation.findUnique({
    where: { id: ctx.id },
    select: {
      id: true,
      confirmationNumber: true,
      pdfStoragePath: true,
      pdfSha256: true,
      pdfSize: true,
    },
  });
  if (!confirmation?.pdfStoragePath || !confirmation.pdfSha256) {
    return NextResponse.json({ ok: false, error: "Depolanmış PDF bulunamadı." }, { status: 404 });
  }

  // Bütünlük denetimi (§ 13): diskteki dosyanın SHA-256'sı kayıttakiyle aynı mı?
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
      {
        ok: false,
        error:
          "PDF bütünlük hatası: depolanan dosya kayıttaki SHA-256 ile uyuşmuyor. Sistem yöneticisine haber verin (kayıt PDF_INTEGRITY_ERROR).",
      },
      { status: 500 },
    );
  }

  await writeAudit({
    userId: user.id,
    userLabel: buildUserLabel(user.name, user.email),
    action: "PDF_DOWNLOAD",
    entity: "ZuwendungConfirmation",
    entityId: confirmation.id,
    after: { confirmationNumber: confirmation.confirmationNumber },
  });

  void stat;
  const stream = Readable.toWeb(createReadStream(absolutePath)) as ReadableStream<Uint8Array>;
  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${confirmation.confirmationNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
