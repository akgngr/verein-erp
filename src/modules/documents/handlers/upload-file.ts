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

import { ALLOWED_EXTENSIONS, MAX_FILES_PER_DOCUMENT } from "../constants";
import { documentsPermissions } from "../permissions";

/**
 * Dosya yükleme (POST /api/documents/[id]/files, 7. bölüm).
 *
 * KARAR: Yeni evrak oluşturulurken yükleme documents.create, mevcut evrakta
 * documents.update gerektirir; basitlik için handler ikisinden birine sahip
 * olmayı yeterli sayar. VIEWER yalnızca view yetkisine sahip olduğundan
 * asla yükleyemez. Handler'lar yönlendirme yapmaz; hata JSON döner.
 *
 * Faz 2: doğrulama ve depolama shared/files katmanına taşındı; davranış
 * Faz 1 ile birebir aynıdır (aynı uzantı alt kümesi, 20 MB, aynı başlıklar).
 */
export async function uploadFileHandler(request: Request, ctx: { id: string }): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  const mayUpload =
    can(user.role, documentsPermissions, "create") || can(user.role, documentsPermissions, "update");
  if (!mayUpload) {
    return NextResponse.json(
      { ok: false, error: "Bu işlem için yetkiniz yok." },
      { status: 403 },
    );
  }

  const db = getDb();
  const doc = await db.document.findFirst({
    where: { id: ctx.id, deletedAt: null },
    select: { id: true, year: true, registryNumber: true },
  });
  if (!doc) {
    return NextResponse.json({ ok: false, error: "Evrak bulunamadı." }, { status: 404 });
  }

  const activeCount = await db.documentFile.count({
    where: { documentId: doc.id, deletedAt: null },
  });
  if (activeCount >= MAX_FILES_PER_DOCUMENT) {
    return NextResponse.json(
      { ok: false, error: `Evrak başına en fazla ${MAX_FILES_PER_DOCUMENT} dosya eklenebilir.` },
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
    allowedExtensions: ALLOWED_EXTENSIONS,
    maxBytes,
  });
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: await uploadErrorMessage(validation) }, { status: 400 });
  }

  // KARAR: documents depolama yolu Faz 1'deki gibi modül öneksizdir:
  // <yıl>/<documentId>/<storedName> (mevcut verilerle uyum için değişmez).
  const storedName = makeStoredName(validation.file.extension);
  const storagePath = path.posix.join(String(doc.year), doc.id, storedName);

  await saveFile(storagePath, parsed.file.buffer);
  try {
    const created = await db.documentFile.create({
      data: {
        documentId: doc.id,
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
      entity: "DocumentFile",
      entityId: created.id,
      after: {
        registryNumber: doc.registryNumber,
        fileName: created.originalName,
        size: created.size,
      },
    });

    return NextResponse.json({
      ok: true,
      file: { id: created.id, originalName: created.originalName, size: created.size },
    });
  } catch (error) {
    // Kayıt oluşamadıysa diske yazılan dosya temizlenir (7. bölüm).
    await removeFile(storagePath);
    console.error("[upload-file] Dosya kaydı oluşturulamadı:", error);
    return NextResponse.json({ ok: false, error: "Dosya yüklenemedi." }, { status: 500 });
  }
}
