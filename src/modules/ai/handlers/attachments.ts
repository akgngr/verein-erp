import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getEnv } from "@/shared/env";
import { parseSingleFileUpload, uploadErrorMessage, validateUpload } from "@/shared/files";
import { extractAttachmentText } from "@/shared/files/attachment-text";
import { saveTempUpload } from "@/shared/files/temp-uploads";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { aiPermissions } from "../permissions";
import { AI_ATTACHMENT_EXTENSIONS, sealAttachment } from "../services/attachments";
import { getActiveProvider, hasAiConsent } from "../services/consent";

/**
 * POST /api/ai/attachments — sohbet eki. Dosya kaydedilmez: metin çıkarılır (gerekirse OCR) ve şifreli,
 * süreli bir mühür döner. Denetim kaydına yalnız meta veri (ad, boyut, kaynak, karakter sayısı) yazılır.
 */
export async function aiAttachmentHandler(request: Request): Promise<Response> {
  const fail = async (key: string, status: number) => NextResponse.json({ ok: false, error: await translateMessage(key) }, { status });
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail("common.errors.sessionExpired", 401);
    throw error;
  }
  if (!can(user.role, aiPermissions, "view")) return fail("common.errors.forbidden", 403);
  if (!(await getActiveProvider())) return fail("ai.errors.notConfigured", 503);
  if (!(await hasAiConsent(user.id))) return fail("ai.errors.consentRequired", 403);

  const parsed = await parseSingleFileUpload(request);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  const validation = validateUpload({
    file: { originalName: parsed.file.originalName, declaredMime: parsed.file.declaredMime, size: parsed.file.size, head: parsed.file.head },
    allowedExtensions: AI_ATTACHMENT_EXTENSIONS,
    maxBytes: getEnv().MAX_UPLOAD_MB * 1024 * 1024,
  });
  if (!validation.ok) return NextResponse.json({ ok: false, error: await uploadErrorMessage(validation) }, { status: 400 });

  try {
    const extracted = await extractAttachmentText(parsed.file.buffer, validation.file.mimeType, validation.file.extension);
    if (extracted.text === null) return fail(extracted.reason === "unsupported" ? "ai.attachments.unsupported" : "ai.attachments.noText", 422);
    const name = validation.file.originalName;
    // Dosyanın kendisi de kısa süre şifreli tutulur: kullanıcı onaylarsa evrak kaydına vb. eklenir.
    const ref = await saveTempUpload(user.id, parsed.file.buffer, { originalName: name, mimeType: validation.file.mimeType, extension: validation.file.extension, size: validation.file.size });
    const token = sealAttachment(user.id, { name, source: extracted.source, truncated: extracted.truncated, text: extracted.text, ref });
    await writeAudit({ userId: user.id, userLabel: buildUserLabel(user.name, user.email), action: "AI_ATTACHMENT", entity: "AiAssistant", entityId: null, after: { size: validation.file.size, extension: validation.file.extension, source: extracted.source, chars: extracted.text.length } });
    return NextResponse.json({ ok: true, attachment: { token, name, size: validation.file.size, source: extracted.source, truncated: extracted.truncated } });
  } catch (error) {
    const detail = error instanceof Error ? { name: error.name, message: error.message.split("\n")[0].slice(0, 200) } : { name: typeof error };
    console.error("[ai] ATTACHMENT_FAILED", detail);
    return fail("ai.attachments.failed", 500);
  }
}
