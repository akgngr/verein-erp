import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { requireUser, UnauthorizedError } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";
import { getDb } from "@/shared/db";
import { translateMessage } from "@/shared/i18n/translate-message";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import { formatPdfDate } from "@/shared/pdf/format";
import { resolvePdfLang } from "@/shared/pdf/i18n";
import { can } from "@/shared/permissions/define";

import { MembershipCertificateDocument } from "../pdf/certificate-document";
import { membersPermissions } from "../permissions";
import { formatAddress } from "../utils";

function asciiFileName(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").slice(0, 120);
}

/**
 * GET /api/members/[id]/certificate-pdf?lang=de|tr
 * Üyelik belgesi & üye kartı PDF'i.
 */
export async function exportMemberCertificatePdfHandler(
  request: Request,
  ctx: { id: string },
): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { ok: false, error: await translateMessage("common.errors.sessionExpired") },
        { status: 401 },
      );
    }
    throw error;
  }

  if (!can(user.role, membersPermissions, "view")) {
    return NextResponse.json(
      { ok: false, error: await translateMessage("common.errors.forbidden") },
      { status: 403 },
    );
  }

  const member = await getDb().member.findFirst({
    where: { id: ctx.id, deletedAt: null },
    select: {
      membershipNumber: true,
      firstName: true,
      lastName: true,
      type: true,
      status: true,
      joinDate: true,
      exitDate: true,
      street: true,
      houseNumber: true,
      postalCode: true,
      city: true,
      state: true,
    },
  });
  if (!member) {
    return NextResponse.json(
      { ok: false, error: await translateMessage("members.errors.dataExportMissing") },
      { status: 404 },
    );
  }

  registerSharedPdfFonts();
  const lang = resolvePdfLang(request);
  const [profile, logoDataUri] = await Promise.all([
    getOrganizationProfile(),
    getOrganizationLogoDataUri(),
  ]);

  const addressLabel = formatAddress(member) || null;
  const buffer = await renderToBuffer(
    <MembershipCertificateDocument
      data={{
        organization: { ...profile, logoDataUri },
        lang,
        membershipNumber: member.membershipNumber,
        fullName: `${member.firstName} ${member.lastName}`.trim(),
        type: member.type,
        status: member.status,
        joinDateLabel: formatPdfDate(member.joinDate, lang),
        exitDateLabel: member.exitDate ? formatPdfDate(member.exitDate, lang) : null,
        addressLabel,
        issuedAtLabel: formatPdfDate(new Date(), lang),
      }}
    />,
  );

  const prefix = lang === "de" ? "mitgliedsbescheinigung" : "uyelik-belgesi";
  const file = asciiFileName(`${prefix}-${member.membershipNumber}.pdf`);
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${file}"`,
      "Cache-Control": "no-store",
    },
  });
}
