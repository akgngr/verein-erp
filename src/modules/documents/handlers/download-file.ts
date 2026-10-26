import "server-only";

import { NextResponse } from "next/server";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { INLINE_PREVIEW_EXTENSIONS } from "../constants";
import { documentsPermissions } from "../permissions";
import { getExtension } from "../services/file-validation";
import { openFileStream } from "../services/file-storage";

/** Content-Disposition için ASCII yedek dosya adı üretir. */
function asciiFileName(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").slice(0, 150);
}

/**
 * Dosya indirme/önizleme (GET /api/documents/files/[fileId], 7. bölüm):
 * oturum + documents.view + dosya ve bağlı evrak silinmemiş olmalı.
 * ?inline=1 yalnızca pdf/jpg/png için inline kabul edilir; diğerleri attachment.
 */
export async function downloadFileHandler(
  request: Request,
  ctx: { fileId: string },
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

  if (!can(user.role, documentsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const file = await getDb().documentFile.findFirst({
    where: { id: ctx.fileId, deletedAt: null },
    select: {
      originalName: true,
      mimeType: true,
      storagePath: true,
      document: { select: { deletedAt: true } },
    },
  });
  if (!file || file.document.deletedAt) {
    return NextResponse.json({ ok: false, error: "Dosya bulunamadı." }, { status: 404 });
  }

  const inlineRequested = new URL(request.url).searchParams.get("inline") === "1";
  const canInline = INLINE_PREVIEW_EXTENSIONS.includes(getExtension(file.originalName));
  const disposition = inlineRequested && canInline ? "inline" : "attachment";

  const encodedName = encodeURIComponent(file.originalName);
  const headers = new Headers({
    "Content-Type": file.mimeType,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
    "Content-Disposition": `${disposition}; filename="${asciiFileName(file.originalName)}"; filename*=UTF-8''${encodedName}`,
  });

  return new Response(openFileStream(file.storagePath), { headers });
}
