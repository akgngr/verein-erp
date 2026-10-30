import "server-only";

import { getDb } from "@/shared/db";

import { computeQuorum } from "../services/quorum";
import type { MeetingDetail } from "../types";

/**
 * Toplantı detayı (7.3): gündem (sıralı), katılımcılar, kararlar, görevler ve
 * aktif ekler; silinmiş toplantı bulunamaz sayılır (5. bölüm md. 5).
 * Kararlar numaraya, görevler oluşturulma zamanına göre sıralanır.
 */
export async function getMeeting(id: string): Promise<MeetingDetail | null> {
  const db = getDb();

  const meeting = await db.meeting.findFirst({
    where: { id, deletedAt: null },
    include: {
      agendaItems: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          title: true,
          description: true,
          discussion: true,
          _count: { select: { decisions: true } },
        },
      },
      attendees: { orderBy: [{ role: "asc" }, { name: "asc" }] },
      decisions: {
        orderBy: [{ year: "asc" }, { sequence: "asc" }],
        select: {
          id: true,
          decisionNumber: true,
          text: true,
          result: true,
          agendaItemId: true,
          agendaItem: { select: { title: true } },
          votesFor: true,
          votesAgainst: true,
          votesAbstain: true,
        },
      },
      actionItems: {
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          description: true,
          assigneeId: true,
          assigneeLabel: true,
          dueDate: true,
          status: true,
          decisionId: true,
          decision: { select: { decisionNumber: true } },
        },
      },
      files: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
          uploadedByLabel: true,
          createdAt: true,
        },
      },
    },
  });

  if (!meeting) return null;

  return {
    id: meeting.id,
    meetingNumber: meeting.meetingNumber,
    year: meeting.year,
    sequence: meeting.sequence,
    type: meeting.type,
    title: meeting.title,
    meetingDate: meeting.meetingDate,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    location: meeting.location,
    description: meeting.description,
    quorumRequired: meeting.quorumRequired,
    status: meeting.status,
    approvedAt: meeting.approvedAt,
    approvedByLabel: meeting.approvedByLabel,
    createdById: meeting.createdById,
    createdByLabel: meeting.createdByLabel,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    agendaItems: meeting.agendaItems.map((item) => ({
      id: item.id,
      position: item.position,
      title: item.title,
      description: item.description,
      discussion: item.discussion,
      decisionCount: item._count.decisions,
    })),
    attendees: meeting.attendees.map((attendee) => ({
      id: attendee.id,
      userId: attendee.userId,
      memberId: attendee.memberId,
      name: attendee.name,
      role: attendee.role,
      attendance: attendee.attendance,
      note: attendee.note,
    })),
    decisions: meeting.decisions.map((decision) => ({
      id: decision.id,
      decisionNumber: decision.decisionNumber,
      text: decision.text,
      result: decision.result,
      agendaItemId: decision.agendaItemId,
      agendaItemTitle: decision.agendaItem?.title ?? null,
      votesFor: decision.votesFor,
      votesAgainst: decision.votesAgainst,
      votesAbstain: decision.votesAbstain,
    })),
    actionItems: meeting.actionItems.map((actionItem) => ({
      id: actionItem.id,
      meetingId: meeting.id,
      meetingNumber: meeting.meetingNumber,
      meetingTitle: meeting.title,
      description: actionItem.description,
      assigneeId: actionItem.assigneeId,
      assigneeLabel: actionItem.assigneeLabel,
      dueDate: actionItem.dueDate,
      status: actionItem.status,
      decisionId: actionItem.decisionId,
      decisionNumber: actionItem.decision?.decisionNumber ?? null,
    })),
    files: meeting.files.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      uploadedByLabel: file.uploadedByLabel,
      createdAt: file.createdAt,
    })),
    quorum: computeQuorum(meeting.attendees, meeting.quorumRequired),
  };
}

/** Durum guard'ları ve action'lar için hafif çekirdek; bulunamazsa null döner. */
export async function getMeetingCore(id: string) {
  return getDb().meeting.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      year: true,
      meetingNumber: true,
      type: true,
      status: true,
      meetingDate: true,
      title: true,
      deletedAt: true,
    },
  });
}
