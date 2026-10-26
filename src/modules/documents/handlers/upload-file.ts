import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { MAX_FILES_PER_DOCUMENT } from "../constants";
import { documentsPermissions } from "../permissions";
import { cleanupFile } from "../services/file-storage";
import { validateFile } from "../services/file-validation";
import { buildStoragePath, makeStoredName, saveFile } from "../services/file-storage";
import { getEnv } from "@/shared/env";

/**
 * Dosya yükleme (POST /api/documents/[id]/files, 7. bölüm).
 *
 * KARAR: Yeni evrak oluşturulurken yükleme documents.create, mevcut evrakta
 * documents.update gerektirir; basitlik için handler ikisinden birine sahip
 * olmayı yeterli sayar. VIEWER yalnızca view yetkisine sahip olduğundan
 * asla yükleyemez. Handler'lar yönlendirme yapmaz; hata JSON döner.
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Dosya okunamadı (multipart/form-data bekleniyor)." },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Dosya bulunamadı." }, { status: 400 });
  }

  const maxBytes = getEnv().MAX_UPLOAD_MB * 1024 * 1024;
  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateFile({
    originalName: file.name,
    declaredMime: file.type,
    size: buffer.byteLength,
    maxBytes,
    head: new Uint8Array(buffer.subarray(0, 8)),
  });
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const storedName = makeStoredName(validation.file.extension);
  const storagePath = buildStoragePath(doc.year, doc.id, storedName);

  await saveFile(storagePath, buffer);
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
    await cleanupFile(storagePath);
    console.error("[upload-file] Dosya kaydı oluşturulamadı:", error);
    return NextResponse.json({ ok: false, error: "Dosya yüklenemedi." }, { status: 500 });
  }
}
