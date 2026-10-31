import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { getTranslations } from "next-intl/server";
import { NextResponse } from "next/server";

import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { buildUserLabel } from "@/shared/utils";

import type { SessionUser } from "@/modules/auth";
import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";

import { MarkdownPdfDocument } from "@/shared/pdf/markdown-document";
import { aiPermissions } from "../permissions";
import { hasAiConsent } from "../services/consent";
import { getReport } from "../services/reports";

async function authorize(): Promise<SessionUser | Response> {
  let user: SessionUser;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
  if (!can(user.role, aiPermissions, "view") || !(await hasAiConsent(user.id))) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }
  return user;
}

const fileName = (title: string) => `${title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "rapor"}.pdf`;

async function render(user: SessionUser, title: string, markdown: string, createdAt: Date): Promise<Response> {
  const [profile, logoDataUri, t] = await Promise.all([getOrganizationProfile(), getOrganizationLogoDataUri(), getTranslations("ai.report")]);
  registerSharedPdfFonts();
  const buffer = await renderToBuffer(
    <MarkdownPdfDocument
      data={{
        organization: { name: profile.name, street: profile.street, postalCode: profile.postalCode, city: profile.city, registerCourt: profile.registerCourt, registerNumber: profile.registerNumber, logoDataUri },
        title,
        markdown,
        createdAt,
        strings: { createdAt: t("createdAt"), note: t("note"), footer: (page, total) => t("footer", { page, total }) },
      }}
    />,
  );
  // Denetim kaydına içerik yazılmaz; yalnızca üretildiği bilgisi.
  await writeAudit({ userId: user.id, userLabel: buildUserLabel(user.name, user.email), action: "EXPORT", entity: "AiReport", entityId: null, after: { report: "ai-pdf" } });
  const name = fileName(title);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}

/** GET /api/ai/reports/[id]/pdf — asistanın hazırladığı rapor (yalnızca sahibine). */
export async function aiReportPdfHandler(_request: Request, id: string): Promise<Response> {
  const user = await authorize();
  if (user instanceof Response) return user;
  const report = await getReport(user.id, id);
  if (!report) return NextResponse.json({ ok: false, error: await translateMessage("ai.errors.reportNotFound") }, { status: 404 });
  return render(user, report.title, report.markdown, report.createdAt);
}
