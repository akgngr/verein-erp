import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";
import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can } from "@/shared/permissions/define";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { formatPdfDate, formatPdfMoney } from "@/shared/pdf/format";
import { resolvePdfLang } from "@/shared/pdf/i18n";

import { GrantReportDocument, type ReportPdfLabels } from "../pdf/report-document";
import { grantsPermissions } from "../permissions";
import { buildReport, getGrant } from "../services/grants";

/** GET /api/grants/<id>/report-pdf — Verwendungsnachweis PDF (?lang=de|tr; varsayılan belge dili). */
export async function grantReportPdfHandler(request: Request, ctx: { id: string }): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
  if (!can(user.role, grantsPermissions, "view")) return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  const grant = await getGrant(ctx.id.slice(0, 64));
  if (!grant) return NextResponse.json({ ok: false, error: await translateMessage("grants.errors.notFound") }, { status: 404 });

  const lang = resolvePdfLang(request);
  const t = await getTranslations({ locale: lang, namespace: "grants" });
  const report = await buildReport(grant, t("otherLine"));
  const money = (cents: number) => formatPdfMoney(cents, lang);
  const labels: ReportPdfLabels = {
    title: t("pdf.title"), funder: t("fields.funder"), fileNumber: t("fields.fileNumber"), period: t("pdf.period"), purpose: t("fields.purpose"),
    narrative: t("report.narrative"), numbers: t("report.numbers"), financing: t("pdf.financing"), vouchers: t("report.vouchers"),
    line: t("report.line"), planned: t("report.planned"), actual: t("report.actual"), diff: t("report.diff"), total: t("report.total"),
    date: t("report.date"), number: t("report.number"), lineCol: t("report.lineCol"), description: t("report.description"), amount: t("report.amount"), receipt: t("report.receipt"),
    financingKeys: Object.fromEntries((["approvedCents", "receivedCents", "ownShareCents", "thirdPartyCents", "otherIncomeCents", "neededGrantCents"] as const).map((key) => [key, t(`financing.${key}`)])),
    overpaid: t("overpaid", { amount: money(report.financing.overpaidCents) }), netNote: t("pdf.netNote"), grossNote: t("pdf.grossNote"), deviationHint: t("deviationHint"),
    signature: t("pdf.signature"), place: t("pdf.place"), created: t("pdf.created", { date: formatPdfDate(new Date(), lang) }),
  };
  const [profile, logoDataUri] = await Promise.all([getOrganizationProfile(), getOrganizationLogoDataUri()]);
  registerSharedPdfFonts();
  const buffer = await renderToBuffer(<GrantReportDocument grant={grant} report={report} organization={{ ...profile, logoDataUri }} labels={labels} money={money} date={(value) => formatPdfDate(new Date(`${value}T12:00:00Z`), lang)} />);
  await writeAudit({ userId: user.id, action: "EXPORT", entity: "Grant", entityId: grant.id });
  return new Response(new Uint8Array(buffer), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="verwendungsnachweis-${grant.id.slice(0, 10)}.pdf"`, "Cache-Control": "no-store" } });
}
