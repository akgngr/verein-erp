import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import type { ReactElement } from "react";

import { writeAudit } from "@/shared/audit/write-audit";
import { translateMessage } from "@/shared/i18n/translate-message";
import { can, type PermissionAction } from "@/shared/permissions/define";
import { registerSharedPdfFonts } from "@/shared/pdf/fonts";
import type { LetterheadProfile } from "@/shared/pdf/letterhead";
import { buildUserLabel } from "@/shared/utils";

import type { SessionUser } from "@/modules/auth";
import { UnauthorizedError, requireUser } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";

import { accountingPermissions } from "../permissions";

/** Content-Disposition için ASCII yedek dosya adı üretir. */
function asciiFileName(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_").slice(0, 150);
}

/** PDF uçları için oturum + yetki denetimi; başarısızsa hazır yanıt döner. */
export async function authorizePdf(action: PermissionAction = "view"): Promise<SessionUser | Response> {
  let user: SessionUser;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: await translateMessage("common.errors.sessionExpired") }, { status: 401 });
    }
    throw error;
  }
  if (!can(user.role, accountingPermissions, action)) {
    return NextResponse.json({ ok: false, error: await translateMessage("common.errors.forbidden") }, { status: 403 });
  }
  return user;
}

/** Antet: dernek profili + logo (organization public API). */
export async function loadLetterhead(): Promise<LetterheadProfile> {
  const [profile, logoDataUri] = await Promise.all([getOrganizationProfile(), getOrganizationLogoDataUri()]);
  return {
    name: profile.name,
    street: profile.street,
    postalCode: profile.postalCode,
    city: profile.city,
    registerCourt: profile.registerCourt,
    registerNumber: profile.registerNumber,
    taxNumber: profile.taxNumber,
    taxOffice: profile.taxOffice,
    exemptionNoticeDate: profile.exemptionNoticeDate,
    exemptionNoticePeriod: profile.exemptionNoticePeriod,
    exemptionDocumentType: profile.exemptionDocumentType,
    logoDataUri,
  };
}

/** Belgeyi çizer, üretimi denetim kaydına yazar (EXPORT) ve satır içi PDF yanıtı döner. */
export async function pdfResponse(args: {
  user: SessionUser;
  document: ReactElement;
  fileName: string;
  audit: { entity: string; entityId: string | null; after: Record<string, unknown> };
}): Promise<Response> {
  registerSharedPdfFonts();
  // react-pdf Document öğesi bekler; çağıranlar <XxxDocument /> geçirir.
  const buffer = await renderToBuffer(args.document as Parameters<typeof renderToBuffer>[0]);
  await writeAudit({
    userId: args.user.id,
    userLabel: buildUserLabel(args.user.name, args.user.email),
    action: "EXPORT",
    entity: args.audit.entity,
    entityId: args.audit.entityId,
    after: args.audit.after,
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiFileName(args.fileName)}"; filename*=UTF-8''${encodeURIComponent(args.fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
