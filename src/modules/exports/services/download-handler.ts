import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { buildUserLabel } from "@/shared/utils";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { exportsPermissions } from "../permissions";
import { readGeneratedFile } from "./files";

const safeName = (title: string, extension: string) => `${title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 80) || "file"}.${extension}`;

/** GET /api/exports/[id] — yalnızca dosyanın sahibi; içerik bellekte çözülür, diske düz yazılmaz. */
export async function downloadGeneratedFileHandler(id: string): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
  if (!can(user.role, exportsPermissions, "view")) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  const file = await readGeneratedFile(user.id, id);
  if (!file) return NextResponse.json({ ok: false, error: await translateMessage("exports.errors.notFound") }, { status: 404 });
  await writeAudit({ userId: user.id, userLabel: buildUserLabel(user.name, user.email), action: "FILE_DOWNLOAD", entity: "GeneratedFile", entityId: id });
  const name = safeName(file.title, file.extension);
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
