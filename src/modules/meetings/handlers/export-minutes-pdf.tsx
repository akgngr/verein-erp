import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { UnauthorizedError, requireUser } from "@/modules/auth/server";

import { meetingsPermissions } from "../permissions";
import { MinutesDocument, type MinutesPdfData } from "../pdf/minutes-document";

/**
 * Tutanak PDF dışa aktarımı (GET /api/meetings/[id]/minutes-pdf, 9. bölüm):
 * oturum + meetings.view; dosya adı tutanak-<toplantıNo>.pdf; inline disposition
 * (tarayıcıda açılır); Cache-Control: no-store. İndirme/PDF loglanmaz (10. bölüm).
 */
export async function exportMinutesPdfHandler(
  _request: Request,
  ctx: { id: string },
): Promise<Response> {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: "Oturum bulunamadı." }, { status: 401 });
    }
    throw error;
  }

  if (!can(user.role, meetingsPermissions, "view")) {
    return NextResponse.json({ ok: false, error: "Bu işlem için yetkiniz yok." }, { status: 403 });
  }

  const db = getDb();
  const meeting = await db.meeting.findFirst({
    where: { id: ctx.id, deletedAt: null },
    include: {
      attendees: { orderBy: [{ role: "asc" }, { name: "asc" }] },
      agendaItems: {
        orderBy: { position: "asc" },
        include: {
          decisions: { orderBy: [{ year: "asc" }, { sequence: "asc" }] },
        },
      },
      decisions: {
        orderBy: [{ year: "asc" }, { sequence: "asc" }],
        where: { agendaItemId: null },
      },
      actionItems: { orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!meeting) {
    return NextResponse.json({ ok: false, error: "Toplantı bulunamadı." }, { status: 404 });
  }

  const presentCount = meeting.attendees.filter(
    (attendee) => attendee.attendance === "PRESENT",
  ).length;

  const data: MinutesPdfData = {
    meetingNumber: meeting.meetingNumber,
    type: meeting.type,
    title: meeting.title,
    meetingDate: meeting.meetingDate,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    location: meeting.location,
    status: meeting.status,
    approvedAt: meeting.approvedAt,
    approvedByLabel: meeting.approvedByLabel,
    quorumRequired: meeting.quorumRequired,
    presentCount,
    attendees: meeting.attendees.map((attendee) => ({
      name: attendee.name,
      role: attendee.role,
      attendance: attendee.attendance,
    })),
    agendaItems: meeting.agendaItems.map((item) => ({
      position: item.position,
      title: item.title,
      description: item.description,
      discussion: item.discussion,
      decisions: item.decisions.map((decision) => ({
        decisionNumber: decision.decisionNumber,
        text: decision.text,
        result: decision.result,
        votesFor: decision.votesFor,
        votesAgainst: decision.votesAgainst,
        votesAbstain: decision.votesAbstain,
      })),
    })),
    unlinkedDecisions: meeting.decisions.map((decision) => ({
      decisionNumber: decision.decisionNumber,
      text: decision.text,
      result: decision.result,
      votesFor: decision.votesFor,
      votesAgainst: decision.votesAgainst,
      votesAbstain: decision.votesAbstain,
    })),
    actionItems: meeting.actionItems.map((actionItem) => ({
      description: actionItem.description,
      assigneeLabel: actionItem.assigneeLabel,
      dueDate: actionItem.dueDate,
      status: actionItem.status,
    })),
  };

  const buffer = await renderToBuffer(<MinutesDocument data={data} />);

  // KARAR: dosya adı ASCII güvenlidir (toplantı numarası zaten ASCII: TOP-2026-001).
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="tutanak-${meeting.meetingNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
