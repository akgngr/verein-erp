import "server-only";

import { NextResponse } from "next/server";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { resolvePdfLang } from "@/shared/pdf/i18n";

import { onlineFormsPermissions } from "../permissions";
import { getEvidence, getStoredDocument } from "../services/evidence-store";
import { renderEvidencePdf } from "../services/evidence-pdf";

/** GET /api/online-forms/<id>/pdf — imzalı formun kanıt PDF'i (online-forms.view; erişim denetim kaydına yazılır). */
export async function evidencePdfHandler(request: Request, ctx: { id: string }): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
  if (!can(user.role, onlineFormsPermissions, "view")) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  const evidence = await getEvidence(ctx.id.slice(0, 64));
  if (!evidence) return NextResponse.json({ ok: false, error: await translateMessage("online-forms.errors.notFound") }, { status: 404 });

  const url = new URL(request.url);
  const lang = resolvePdfLang(request);
  const stored = url.searchParams.has("lang") ? null : await getStoredDocument(ctx.id.slice(0, 64));
  const buffer = stored ?? (await renderEvidencePdf(evidence.snapshot, evidence.signature, lang));
  await writeAudit({ userId: user.id, action: "EXPORT", entity: "OnlineFormRequest", entityId: ctx.id });
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${evidence.snapshot.documentKey ?? "e-sign"}.pdf"`, "Cache-Control": "no-store" },
  });
}

