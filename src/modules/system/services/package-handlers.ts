import "server-only";

import { NextResponse } from "next/server";

import { requireUser, UnauthorizedError } from "@/modules/auth/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { parseSingleFileUpload } from "@/shared/files";
import { translateMessage } from "@/shared/i18n/translate-message";
import { MAX_PACKAGE_BYTES } from "@/shared/marketplace/package";
import { can } from "@/shared/permissions/define";
import { systemPermissions } from "@/shared/permissions/system";
import { buildUserLabel } from "@/shared/utils";

import { uploadModulePackage } from "./packages";

/** POST /api/system/packages — .vmod yükle ve doğrula (içerik çalıştırılmaz). */
export async function uploadPackageHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
  if (!can(user.role, systemPermissions, "update")) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  const parsed = await parseSingleFileUpload(request);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error }, { status: parsed.status });
  if (!parsed.file.originalName.toLowerCase().endsWith(".vmod") || parsed.file.size > MAX_PACKAGE_BYTES) {
    return NextResponse.json({ ok: false, error: await translateMessage("system.packages.errors.file") }, { status: 400 });
  }
  const label = buildUserLabel(user.name, user.email);
  const row = await uploadModulePackage(Buffer.from(parsed.file.buffer), { id: user.id, label });
  await writeAudit({ userId: user.id, userLabel: label, action: "IMPORT", entity: "SystemModulePackage", entityId: row.id, after: { key: row.moduleKey, version: row.version, publisher: row.publisher, verified: row.verified, errors: row.errors } });
  return NextResponse.json({ ok: true, verified: row.verified, id: row.id });
}
