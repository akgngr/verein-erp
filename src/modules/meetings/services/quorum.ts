import "server-only";

import type { MeetingAttendee } from "@prisma/client";

import type { QuorumInfo } from "../types";

/**
 * Yeter sayısı hesabı (5. bölüm md. 8): presentCount = katılımı PRESENT olan
 * katılımcılar; quorumRequired tanımlıysa reached karşılaştırması yapılır,
 * tanımlı değilse reached null döner (banner gösterilmez).
 */
export function computeQuorum(
  attendees: Pick<MeetingAttendee, "attendance">[],
  quorumRequired: number | null,
): QuorumInfo {
  const presentCount = attendees.filter((attendee) => attendee.attendance === "PRESENT").length;
  if (quorumRequired === null || quorumRequired === undefined) {
    return { presentCount, required: null, reached: null };
  }
  return { presentCount, required: quorumRequired, reached: presentCount >= quorumRequired };
}
