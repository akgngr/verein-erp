import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { requireUser, UnauthorizedError } from "@/modules/auth/server";
import { getOrganizationLogoDataUri, getOrganizationProfile } from "@/modules/organization/server";
import { getDb } from "@/shared/db";
import { translateMessage } from "@/shared/i18n/translate-message";
import { resolvePdfLang } from "@/shared/pdf/i18n";
import { can } from "@/shared/permissions/define";

import { InvitationDocument } from "../pdf/invitation-document";
import { meetingsPermissions } from "../permissions";
import { evaluateInvitationNoticePeriod } from "../services/notice-period";

/**
 * Davetiye ve Gündem PDF dışa aktarımı (GET /api/meetings/[id]/invitation-pdf?lang=de|tr).
 */
export async function exportInvitationPdfHandler(
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

  if (!can(user.role, meetingsPermissions, "view")) {
    return NextResponse.json(
      { ok: false, error: await translateMessage("common.errors.forbidden") },
      { status: 403 },
    );
  }

  const meeting = await getDb().meeting.findFirst({
    where: { id: ctx.id, deletedAt: null },
    include: {
      agendaItems: { orderBy: { position: "asc" } },
    },
  });
  if (!meeting) {
    return NextResponse.json(
      { ok: false, error: await translateMessage("meetings.errors.meetingNotFound2") },
      { status: 404 },
    );
  }

  const lang = resolvePdfLang(request);
  const [profile, logoDataUri] = await Promise.all([
    getOrganizationProfile(),
    getOrganizationLogoDataUri(),
  ]);

  const notice = evaluateInvitationNoticePeriod({
    type: meeting.type,
    meetingDate: meeting.meetingDate,
    invitationSentAt: meeting.invitationSentAt,
  });

  const buffer = await renderToBuffer(
    <InvitationDocument
      data={{
        lang,
        organization: { ...profile, logoDataUri },
        meetingNumber: meeting.meetingNumber,
        type: meeting.type,
        title: meeting.title,
        meetingDate: meeting.meetingDate,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        location: meeting.location,
        description: meeting.description,
        quorumRequired: meeting.quorumRequired,
        invitationSentAt: meeting.invitationSentAt,
        notice,
        agendaItems: meeting.agendaItems.map((item) => ({
          position: item.position,
          title: item.title,
          description: item.description,
        })),
      }}
    />,
  );

  const prefix = lang === "de" ? "einladung" : "davetiye";
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${prefix}-${meeting.meetingNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
