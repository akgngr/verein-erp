import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { buildDownloadResponse, makeStoredName, openReadStream, parseSingleFileUpload, removeFile, saveFile, uploadErrorMessage, validateUpload } from "@/shared/files";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { feedbackPermissions } from "../permissions";
import { feedbackCreateSchema } from "../schemas/feedback";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"] as const;

async function authorize(action: "create" | "view") {
  try {
    const user = await requireUser();
    if (!can(user.role, feedbackPermissions, action)) return { error: NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 }) };
    return { user };
  } catch (error) {
    if (error instanceof UnauthorizedError) return { error: NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 }) };
    throw error;
  }
}

/**
 * POST /api/feedback/create — hata/öneri kaydı (multipart: alanlar + isteğe bağlı ekran görüntüsü).
 * Bağlam (sayfa, tarayıcı, ekran) istemciden gelir; form içerikleri gönderilmez.
 */
export async function createFeedbackHandler(request: Request): Promise<Response> {
  const auth = await authorize("create");
  if ("error" in auth) return auth.error as Response;
  const { user } = auth;

  const form = await request.formData();
  const field = (name: string) => {
    const value = form.get(name);
    return typeof value === "string" ? value : undefined;
  };
  const parsed = feedbackCreateSchema.safeParse({ type: field("type"), title: field("title"), description: field("description"), pageUrl: field("pageUrl"), userAgent: field("userAgent"), viewport: field("viewport") });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "common.errors.unexpected";
    return NextResponse.json({ ok: false, error: await translateMessage(message) }, { status: 400 });
  }

  // İsteğe bağlı ekran görüntüsü (yalnızca PNG/JPG).
  let screenshot: { path: string; name: string; mime: string } | null = null;
  const file = form.get("screenshot");
  if (file instanceof File && file.size > 0) {
    const body = new FormData();
    body.append("file", file);
    const upload = await parseSingleFileUpload(new Request(request.url, { method: "POST", body }));
    if (!upload.ok) return NextResponse.json({ ok: false, error: upload.error }, { status: upload.status });
    const validation = validateUpload({
      file: { originalName: upload.file.originalName, declaredMime: upload.file.declaredMime, size: upload.file.size, head: upload.file.head },
      allowedExtensions: IMAGE_EXTENSIONS,
      maxBytes: Math.min(getEnv().MAX_UPLOAD_MB, 5) * 1024 * 1024,
    });
    if (!validation.ok) return NextResponse.json({ ok: false, error: await uploadErrorMessage(validation) }, { status: 400 });
    const path = ["feedback", String(new Date().getUTCFullYear()), makeStoredName(validation.file.extension)].join("/");
    await saveFile(path, upload.file.buffer);
    screenshot = { path, name: validation.file.originalName, mime: validation.file.mimeType };
  }

  try {
    const label = buildUserLabel(user.name, user.email);
    const created = await getDb().feedbackItem.create({
      data: {
        ...parsed.data,
        pageUrl: parsed.data.pageUrl || null,
        userAgent: parsed.data.userAgent || null,
        viewport: parsed.data.viewport || null,
        appVersion: process.env.npm_package_version ?? null,
        screenshotPath: screenshot?.path ?? null,
        screenshotName: screenshot?.name ?? null,
        screenshotMime: screenshot?.mime ?? null,
        reporterId: user.id,
        reporterLabel: label,
      },
    });
    await writeAudit({ userId: user.id, userLabel: label, action: "CREATE", entity: "FeedbackItem", entityId: created.id, after: { number: created.number, type: created.type } });
    return NextResponse.json({ ok: true, id: created.id, number: created.number });
  } catch (error) {
    if (screenshot) await removeFile(screenshot.path);
    throw error;
  }
}

/** GET /api/feedback/[id]/screenshot — yalnızca yöneticiler (approve). */
export async function feedbackScreenshotHandler(_request: Request, id: string): Promise<Response> {
  const auth = await authorize("view");
  if ("error" in auth) return auth.error as Response;
  if (!can(auth.user.role, feedbackPermissions, "approve")) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  const item = await getDb().feedbackItem.findUnique({ where: { id }, select: { screenshotPath: true, screenshotName: true, screenshotMime: true } });
  if (!item?.screenshotPath) return NextResponse.json({ ok: false, error: await translateMessage("feedback.errors.notFound") }, { status: 404 });
  return buildDownloadResponse({ stream: openReadStream(item.screenshotPath), originalName: item.screenshotName ?? "screenshot.png", mimeType: item.screenshotMime ?? "image/png", inline: true });
}
