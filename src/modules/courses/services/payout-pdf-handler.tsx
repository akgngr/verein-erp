import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { translateMessage } from "@/shared/i18n/translate-message";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { resolvePdfLang } from "@/shared/pdf/i18n";
import { can } from "@/shared/permissions/define";

import { requireUser, UnauthorizedError } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";

import { PayoutDocument } from "../pdf/payout-document";
import { coursePayoutsAllPermissions, coursePayoutsPermissions } from "../permissions";
import { getPayoutForPdf } from "./payouts";

/**
 * GET /api/courses/payouts/pdf?id=…&lang=de|tr — öğretmen hakedişi (Gutschrift). Öğretmen yalnızca
 * kendi hakedişini indirebilir. IBAN yalnızca PDF'e yazılır; hiçbir yerde saklanmaz/loglanmaz.
 */
export async function payoutPdfHandler(request: Request): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) return Response.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    throw error;
  }
  if (!can(user.role, coursePayoutsPermissions, "view")) return Response.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const data = await getPayoutForPdf(id);
  const ownOnly = !can(user.role, coursePayoutsAllPermissions, "view");
  if (!data || (ownOnly && data.payout.teacher.userId !== user.id) || data.payout.status === "CANCELLED") {
    return Response.json({ ok: false, error: await translateMessage("courses.payouts.errors.notFound") }, { status: 404 });
  }
  const [profile, logoDataUri] = await Promise.all([getOrganizationProfile(), getOrganizationLogoDataUri()]);
  registerSharedPdfFonts();
  const lang = resolvePdfLang(request);
  const { payout } = data;
  const name = `${payout.teacher.firstName} ${payout.teacher.lastName}`.trim();
  const buffer = await renderToBuffer(
    <PayoutDocument
      data={{
        lang,
        organization: { ...profile, logoDataUri },
        number: payout.number,
        period: payout.period,
        issuedAt: payout.approvedAt ?? new Date(),
        compensation: payout.compensation,
        rateCents: payout.rateCents,
        rateUnit: payout.rateUnit,
        amountCents: payout.amountCents,
        minutes: payout.minutes,
        lines: payout.lines,
        recipient: {
          name,
          businessName: data.profile?.businessName ?? null,
          accountHolder: data.profile?.accountHolder ?? null,
          iban: data.profile?.iban ?? null,
          bic: data.profile?.bic ?? null,
          taxNumber: data.profile?.taxNumber ?? null,
          vatId: data.profile?.vatId ?? null,
          isSmallBusiness: data.profile?.isSmallBusiness ?? false,
        },
      }}
    />,
  );
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${payout.number ?? `Honorar-${payout.period}`}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
