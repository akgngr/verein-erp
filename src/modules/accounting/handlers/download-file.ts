import "server-only";

import { NextResponse } from "next/server";

import { getDb } from "@/shared/db";
import { buildDownloadResponse, openReadStream } from "@/shared/files";
import { can } from "@/shared/permissions/define";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { translateMessage } from "@/shared/i18n/translate-message";

/**
 * Fiş belgesi indirme/önizleme (GET /api/accounting/files/[fileId], § 9):
 * oturum + accounting.view; dosya silinmemiş olmalı. ?inline=1 yalnızca
 * pdf/jpg/png; başlıklar shared/files/http.ts'ten. KARAR: İndirme denetim
 * kaydı YAZILMAZ (§ 13: file downloads are not logged).
 */
export async function downloadBookingFileHandler(
  request: Request,
  ctx: { fileId: string },
): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, accountingPermissions, "view")) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }

  const file = await getDb().accountingBookingFile.findFirst({
    where: { id: ctx.fileId, deletedAt: null },
    select: { originalName: true, mimeType: true, storagePath: true },
  });
  if (!file) {
    return NextResponse.json({ ok: false, error: await translateMessage("files.missing") }, { status: 404 });
  }

  const inlineRequested = new URL(request.url).searchParams.get("inline") === "1";

  return buildDownloadResponse({
    stream: openReadStream(file.storagePath),
    originalName: file.originalName,
    mimeType: file.mimeType,
    inline: inlineRequested,
  });
}
