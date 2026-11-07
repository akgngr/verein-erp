import "server-only";

import { NextResponse } from "next/server";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";

import { sepaPermissions } from "../permissions";
import { getRunXml } from "../services/runs";

/** GET /api/sepa/<id>/xml — pain.008 dosyası (IBAN içerir; yalnız oluşturma yetkisi, indirme denetim kaydına yazılır). */
export async function runXmlHandler(_request: Request, ctx: { id: string }): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
  if (!can(user.role, sepaPermissions, "create")) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  const file = await getRunXml(ctx.id.slice(0, 64));
  if (!file) return NextResponse.json({ ok: false, error: await translateMessage("sepa.errors.notFound") }, { status: 404 });
  await writeAudit({ userId: user.id, action: "EXPORT", entity: "SepaDebitRun", entityId: ctx.id });
  return new Response(file.xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Content-Disposition": `attachment; filename="${file.number}.xml"`, "Cache-Control": "no-store" } });
}
