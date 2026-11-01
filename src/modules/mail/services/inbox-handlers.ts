import "server-only";

import { NextResponse } from "next/server";

import { requireUser, UnauthorizedError } from "@/modules/auth/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { buildDownloadResponse, openReadStream, parseSingleFileUpload } from "@/shared/files";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { mailInboxPermissions } from "../permissions";
import { getAttachmentFile, importEml } from "./inbox";

const MAX_EML_BYTES = 30 * 1024 * 1024;

async function authorize(action: "view" | "create") {
  try {
    const user = await requireUser();
    if (!can(user.role, mailInboxPermissions, action)) return { error: NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 }) };
    return { user };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 }) };
    throw error;
  }
}

/** POST /api/mail/inbox/eml — kaydedilmiş e-posta (.eml) yükle. */
export async function uploadEmlHandler(request: Request): Promise<Response> {
  const auth = await authorize("create");
  if ("error" in auth) return auth.error as Response;
  const parsed = await parseSingleFileUpload(request);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  if (!parsed.file.originalName.toLowerCase().endsWith(".eml") || parsed.file.size > MAX_EML_BYTES) {
    return NextResponse.json({ ok: false, error: await translateMessage("mail.inbox.errors.emlInvalid") }, { status: 400 });
  }
  try {
    const result = await importEml(Buffer.from(parsed.file.buffer));
    await writeAudit({ userId: auth.user.id, userLabel: buildUserLabel(auth.user.name, auth.user.email), action: "IMPORT", entity: "MailInboxMessage", after: { source: "EML", ...result } });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[mail/inbox] eml import failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false, error: await translateMessage("mail.inbox.errors.emlInvalid") }, { status: 400 });
  }
}

/** GET /api/mail/inbox/attachment?id=… — eki görüntüle/indir. */
export async function downloadAttachmentHandler(request: Request): Promise<Response> {
  const auth = await authorize("view");
  if ("error" in auth) return auth.error as Response;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const file = await getAttachmentFile(id);
  if (!file) return NextResponse.json({ ok: false, error: await translateMessage("mail.inbox.errors.notFound") }, { status: 404 });
  return buildDownloadResponse({ stream: openReadStream(file.storagePath), originalName: file.fileName, mimeType: file.mimeType, inline: true });
}
