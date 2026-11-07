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
import { getEnvPdfLangDefault, resolvePdfLang, type PdfLang } from "@/shared/pdf/i18n";

import { EvidenceDocument, type EvidencePdfLabels } from "../pdf/evidence-document";
import { onlineFormsPermissions } from "../permissions";
import { getEvidence, getStoredDocument, storeDocument, type EvidenceSnapshot } from "../services/requests";

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

/** Kanıt kaydından PDF üretir (imza anında saklamak ve sonradan başka dilde indirmek için). */
export async function renderEvidencePdf(snapshot: EvidenceSnapshot, signature: string, lang: PdfLang): Promise<Uint8Array> {
  const t = await getTranslations({ locale: lang, namespace: "online-forms" });
  const fieldKeys = ["email", "phone", "birthDate", "profession", "street", "houseNumber", "postalCode", "city", "state", "country", "school", "gradeLevel", "iban", "bic", "accountHolder"];
  const labels: EvidencePdfLabels = {
    title: t("pdf.title"),
    subtitle: t("pdf.subtitle", { name: snapshot.subjectName, kind: t(`kinds.${snapshot.kind}`) }),
    sections: { member: t("public.sections.person"), student: snapshot.signerRole === "guardian" ? t("public.sections.child") : t("public.sections.person"), guardian: t("public.sections.guardian"), consents: t("public.sections.consents"), privacyText: t("settings.privacyText"), photoText: t("settings.photoText"), signature: t("public.sections.signature"), evidence: t("pdf.evidence") },
    fields: { ...Object.fromEntries(fieldKeys.map((key) => [key, t(`public.fields.${key}` as never)])), messagingConsents: t("pdf.messaging"), bulkMailOptOut: t("public.bulkMailOptOut") },
    consents: { sms: t("consents.sms"), whatsapp: t("consents.whatsapp"), telegram: t("consents.telegram") },
    yes: t("pdf.yes"),
    no: t("pdf.no"),
    meta: { documentKey: t("pdf.documentKey"), signer: t("pdf.signer"), signedAt: t("pdf.signedAt"), channel: t("columns.channel"), textVersion: t("pdf.textVersion"), evidenceHash: t("pdf.evidenceHash"), note: t("pdf.note") },
  };
  const [profile, logoDataUri] = await Promise.all([getOrganizationProfile(), getOrganizationLogoDataUri()]);
  registerSharedPdfFonts();
  const dateTime = new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(snapshot.signedAt));
  return renderToBuffer(<EvidenceDocument snapshot={snapshot} signature={signature} organization={{ ...profile, logoDataUri }} labels={labels} dateTime={dateTime} />);
}

/** İmza sonrası: belge varsayılan belge dilinde üretilip şifreli saklanır (hata imzayı geçersiz kılmaz). */
export async function storeEvidencePdf(id: string): Promise<void> {
  const evidence = await getEvidence(id);
  if (!evidence) return;
  await storeDocument(id, await renderEvidencePdf(evidence.snapshot, evidence.signature, getEnvPdfLangDefault()));
}
