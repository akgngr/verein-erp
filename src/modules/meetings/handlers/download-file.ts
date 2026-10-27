import "server-only";

import { NextResponse } from "next/server";

import { getDb } from "@/shared/db";
import { buildDownloadResponse, openReadStream } from "@/shared/files";
import { can } from "@/shared/permissions/define";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { meetingsPermissions } from "../permissions";

/**
 * Toplantı eki indirme/önizleme (GET /api/meetings/files/[fileId], 8. bölüm):
 * oturum + meetings.view; dosya ve bağlı toplantı silinmemiş olmalı.
 * ?inline=1 yalnızca pdf/jpg/png için inline kabul edilir (8. bölüm).
 */
export async function downloadMeetingFileHandler(
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

  if (!can(user.role, meetingsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const file = await getDb().meetingFile.findFirst({
    where: { id: ctx.fileId, deletedAt: null },
    select: {
      originalName: true,
      mimeType: true,
      storagePath: true,
      meeting: { select: { deletedAt: true } },
    },
  });
  if (!file || file.meeting.deletedAt) {
    return NextResponse.json({ ok: false, error: "Dosya bulunamadı." }, { status: 404 });
  }

  const inlineRequested = new URL(request.url).searchParams.get("inline") === "1";

  return buildDownloadResponse({
    stream: openReadStream(file.storagePath),
    originalName: file.originalName,
    mimeType: file.mimeType,
    inline: inlineRequested,
  });
}
