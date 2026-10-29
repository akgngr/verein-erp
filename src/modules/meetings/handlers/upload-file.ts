import "server-only";

import path from "node:path";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { parseSingleFileUpload, uploadErrorMessage, validateUpload } from "@/shared/files";
import { makeStoredName, removeFile, saveFile } from "@/shared/files";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { MAX_FILES_PER_MEETING, MEETING_ALLOWED_EXTENSIONS } from "../constants";
import { meetingsPermissions } from "../permissions";
import { assertMeetingEditable } from "../services/meeting-guards";

/**
 * Toplantı eki yükleme (POST /api/meetings/[id]/files, 8. bölüm):
 * oturum (401 JSON) → meetings.update (403 JSON) → toplantı var ve silinmemiş
 * → dosya sınırı ve doğrulama → diske yaz → MeetingFile satırı → audit.
 * KARAR: yükleme her durumda (onaylı toplantıda bile) mümkündür — imzalı
 * tutanak taramaları onaydan sonra yüklenir (5. bölüm md. 4, files kapsamı).
 */
export async function uploadMeetingFileHandler(
  request: Request,
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

  if (!can(user.role, meetingsPermissions, "update")) {
    return NextResponse.json(
      { ok: false, error: "Bu işlem için yetkiniz yok." },
      { status: 403 },
    );
  }

  const db = getDb();
  const meeting = await db.meeting.findFirst({
    where: { id: ctx.id, deletedAt: null },
    select: { id: true, year: true, meetingNumber: true, status: true, deletedAt: true },
  });
  if (!meeting) {
    return NextResponse.json({ ok: false, error: "Toplantı bulunamadı." }, { status: 404 });
  }
  try {
    assertMeetingEditable(meeting, "files", user.role, meetingsPermissions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Toplantı düzenlenemez.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const activeCount = await db.meetingFile.count({
    where: { meetingId: meeting.id, deletedAt: null },
  });
  if (activeCount >= MAX_FILES_PER_MEETING) {
    return NextResponse.json(
      { ok: false, error: `Toplantı başına en fazla ${MAX_FILES_PER_MEETING} dosya eklenebilir.` },
      { status: 400 },
    );
  }

  const parsed = await parseSingleFileUpload(request);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  }

  const maxBytes = getEnv().MAX_UPLOAD_MB * 1024 * 1024;
  const validation = validateUpload({
    file: {
      originalName: parsed.file.originalName,
      declaredMime: parsed.file.declaredMime,
      size: parsed.file.size,
      head: parsed.file.head,
    },
    allowedExtensions: MEETING_ALLOWED_EXTENSIONS,
    maxBytes,
  });
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: await uploadErrorMessage(validation) }, { status: 400 });
  }

  // Depolama yolu: meetings/<yıl>/<meetingId>/<storedName> (4. bölüm).
  const storedName = makeStoredName(validation.file.extension);
  const storagePath = path.posix.join("meetings", String(meeting.year), meeting.id, storedName);

  await saveFile(storagePath, parsed.file.buffer);
  try {
    const created = await db.meetingFile.create({
      data: {
        meetingId: meeting.id,
        originalName: validation.file.originalName,
        storedName,
        storagePath,
        mimeType: validation.file.mimeType,
        size: validation.file.size,
        uploadedById: user.id,
        uploadedByLabel: buildUserLabel(user.name, user.email),
      },
    });

    await writeAudit({
      userId: user.id,
      userLabel: buildUserLabel(user.name, user.email),
      action: "FILE_UPLOAD",
      entity: "MeetingFile",
      entityId: created.id,
      after: {
        meetingNumber: meeting.meetingNumber,
        fileName: created.originalName,
        size: created.size,
      },
    });

    return NextResponse.json({
      ok: true,
      file: { id: created.id, originalName: created.originalName, size: created.size },
    });
  } catch (error) {
    // Kayıt oluşamadıysa diske yazılan dosya temizlenir (8. bölüm).
    await removeFile(storagePath);
    console.error("[meetings/upload-file] Dosya kaydı oluşturulamadı:", error);
    return NextResponse.json({ ok: false, error: "Dosya yüklenemedi." }, { status: 500 });
  }
}
