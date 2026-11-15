import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getEnv } from "@/shared/env";
import { parseSingleFileUpload, uploadErrorMessage, validateUpload } from "@/shared/files";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { ALLOWED_EXTENSIONS } from "../constants";
import { documentsPermissions } from "../permissions";
import { analyzeDocumentBytes } from "../services/document-analysis";

/**
 * POST /api/documents/analyze — "Evraktan doldur" (docs/specs/DOCUMENTS_AI.md, EV-1).
 * Dosya KAYDEDİLMEZ: metin çıkarılır (gerekirse OCR), form önerileri döner. Yetki: create veya update.
 * Denetim kaydına yalnız meta veri yazılır (dosya adı, boyut, kaynak); metin ve öneri değerleri yazılmaz.
 */
export async function analyzeFileHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
  if (!can(user.role, documentsPermissions, "create") && !can(user.role, documentsPermissions, "update")) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }

  const parsed = await parseSingleFileUpload(request);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  const validation = validateUpload({
    file: { originalName: parsed.file.originalName, declaredMime: parsed.file.declaredMime, size: parsed.file.size, head: parsed.file.head },
    allowedExtensions: ALLOWED_EXTENSIONS,
    maxBytes: getEnv().MAX_UPLOAD_MB * 1024 * 1024,
  });
  if (!validation.ok) return NextResponse.json({ ok: false, error: await uploadErrorMessage(validation) }, { status: 400 });

  try {
    const analysis = await analyzeDocumentBytes(parsed.file.buffer, validation.file.mimeType);
    await writeAudit({
      userId: user.id,
      userLabel: buildUserLabel(user.name, user.email),
      action: "DOCUMENT_ANALYZE",
      entity: "Document",
      entityId: null,
      after: { fileName: validation.file.originalName, size: validation.file.size, source: analysis.source, fields: Object.keys(analysis.suggestions) },
    });
    return NextResponse.json({ ok: true, analysis });
  } catch (error) {
    // Teşhis için yalnız hata türü/kodu ve ilk satır loglanır; evrak metni hata mesajlarına girmez.
    const detail = error instanceof Error ? { name: error.name, code: (error as { code?: string }).code, message: error.message.split("\n")[0].slice(0, 200) } : { name: typeof error };
    console.error("[documents] ANALYZE_FAILED", detail);
    return NextResponse.json({ ok: false, error: await translateMessage("documents.analyze.failed") }, { status: 500 });
  }
}
