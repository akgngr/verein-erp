import "server-only";

import { NextResponse } from "next/server";

import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { buildDownloadResponse, openReadStream, parseSingleFileUpload, uploadErrorMessage, validateUpload } from "@/shared/files";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { importPayableFile } from "../services/payable-import";

export const PAYABLE_FILE_EXTENSIONS = ["pdf", "xml", "jpg", "jpeg", "png"] as const;

async function authorize(action: "view" | "create") {
  try {
    const user = await requireUser();
    if (!can(user.role, accountingPermissions, action)) return { error: NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 }) };
    return { user };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 }) };
    throw error;
  }
}

/**
 * POST /api/accounting/payables — belge yükle (PDF/XML/görsel). XRechnung XML veya ZUGFeRD PDF ise
 * alanlar okunur ve TASLAK önceden doldurulur; aynı dosya (SHA-256) ikinci kez yüklenmez.
 */
export async function uploadPayableHandler(request: Request): Promise<Response> {
  const auth = await authorize("create");
  if ("error" in auth) return auth.error as Response;
  const { user } = auth;

  const parsed = await parseSingleFileUpload(request);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  const validation = validateUpload({
    file: { originalName: parsed.file.originalName, declaredMime: parsed.file.declaredMime, size: parsed.file.size, head: parsed.file.head },
    allowedExtensions: PAYABLE_FILE_EXTENSIONS,
    maxBytes: getEnv().MAX_UPLOAD_MB * 1024 * 1024,
  });
  if (!validation.ok) return NextResponse.json({ ok: false, error: await uploadErrorMessage(validation) }, { status: 400 });

  const result = await importPayableFile({
    buffer: Buffer.from(parsed.file.buffer),
    originalName: validation.file.originalName,
    extension: validation.file.extension,
    mimeType: validation.file.mimeType,
    size: validation.file.size,
    actor: { id: user.id, label: buildUserLabel(user.name, user.email) },
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: await translateMessage("accounting.payables.errors.duplicate"), id: result.id }, { status: 409 });
  return NextResponse.json({ ok: true, id: result.id, source: result.source });
}

/** GET /api/accounting/payables/[id]/file — belge (Beleg) indir / görüntüle. */
export async function downloadPayableFileHandler(request: Request, id: string): Promise<Response> {
  const auth = await authorize("view");
  if ("error" in auth) return auth.error as Response;
  const payable = await getDb().accountingPayable.findUnique({ where: { id }, select: { storagePath: true, originalName: true, mimeType: true } });
  if (!payable?.storagePath || !payable.originalName) return NextResponse.json({ ok: false, error: await translateMessage("accounting.payables.errors.notFound") }, { status: 404 });
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  return buildDownloadResponse({ stream: openReadStream(payable.storagePath), originalName: payable.originalName, mimeType: payable.mimeType ?? "application/octet-stream", inline });
}
