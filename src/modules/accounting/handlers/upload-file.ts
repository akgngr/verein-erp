import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import {
  parseSingleFileUpload,
  validateUpload,
  makeStoredName,
  removeFile,
  saveFile,
} from "@/shared/files";
import { can } from "@/shared/permissions/define";
import { getEnv } from "@/shared/env";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { BOOKING_FILE_EXTENSIONS, MAX_FILES_PER_BOOKING } from "../constants";
import { accountingPermissions } from "../permissions";

/**
 * Fiş (Beleg) yükleme (POST /api/accounting/[id]/files, § 9):
 * oturum (401) → accounting.update veya accounting.create (403) → fiş var +
 * ters kayıt edilmemiş (404/409) → dosya sınırı + doğrulama → diske yaz →
 * AccountingBookingFile satırı → FILE_UPLOAD denetimi. Hata olursa yazılan
 * dosya silinir. Kilit yılda YÜKLEME SERBESTTİR (§ 8 md. 8: geç belge).
 */
export async function uploadBookingFileHandler(
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

  // § 9: update veya create (aynı oturum akışında oluştur→yükle); viewer/asla.
  const hasUpdate = can(user.role, accountingPermissions, "update");
  const hasCreate = can(user.role, accountingPermissions, "create");
  if (!hasUpdate && !hasCreate) {
    return NextResponse.json(
      { ok: false, error: "Bu işlem için yetkiniz yok." },
      { status: 403 },
    );
  }

  const db = getDb();
  const booking = await db.accountingBooking.findUnique({
    where: { id: ctx.id },
    select: { id: true, year: true, bookingNumber: true, reversedAt: true },
  });
  if (!booking) {
    return NextResponse.json({ ok: false, error: "Fiş bulunamadı." }, { status: 404 });
  }
  if (booking.reversedAt) {
    return NextResponse.json(
      { ok: false, error: "İptal edilmiş fişe belge eklenemez." },
      { status: 409 },
    );
  }

  const activeCount = await db.accountingBookingFile.count({
    where: { bookingId: booking.id, deletedAt: null },
  });
  if (activeCount >= MAX_FILES_PER_BOOKING) {
    return NextResponse.json(
      { ok: false, error: `Fiş başına en fazla ${MAX_FILES_PER_BOOKING} belge eklenebilir.` },
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
    allowedExtensions: BOOKING_FILE_EXTENSIONS,
    maxBytes,
  });
  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  // Depolama yolu (§ 9): accounting/<yıl>/<bookingId>/<storedName>.
  const storedName = makeStoredName(validation.file.extension);
  const storagePath = ["accounting", String(booking.year), booking.id, storedName].join("/");

  await saveFile(storagePath, parsed.file.buffer);
  try {
    const created = await db.accountingBookingFile.create({
      data: {
        bookingId: booking.id,
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
      entity: "AccountingBookingFile",
      entityId: created.id,
      after: {
        bookingNumber: booking.bookingNumber,
        fileName: created.originalName,
        size: created.size,
      },
    });

    return NextResponse.json({
      ok: true,
      fileId: created.id,
      originalName: created.originalName,
    });
  } catch (error) {
    await removeFile(storagePath);
    console.error("[accounting/upload] Belge kaydı yazılamadı:", error);
    return NextResponse.json({ ok: false, error: "Belge kaydedilemedi." }, { status: 500 });
  }
}
