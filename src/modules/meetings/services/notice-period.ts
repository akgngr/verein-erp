import type { MeetingType } from "@prisma/client";

export type InvitationNoticeStatus = "compliant" | "short_notice" | "not_sent";

export type InvitationNoticeEvaluation = {
  status: InvitationNoticeStatus;
  requiredDays: number;
  actualDays: number | null;
};

export function requiredNoticeDaysForMeetingType(type: MeetingType): number {
  switch (type) {
    case "GENERAL_ASSEMBLY":
      return 14;
    case "BOARD":
      return 7;
    case "COMMITTEE":
    case "OTHER":
    default:
      return 3;
  }
}

/**
 * Tüzük / BGB davet süresi denetimi:
 * - GENERAL_ASSEMBLY: en az 14 gün
 * - BOARD: en az 7 gün
 * - COMMITTEE / OTHER: en az 3 gün
 */
export function evaluateInvitationNoticePeriod(input: {
  type: MeetingType;
  meetingDate: Date;
  invitationSentAt: Date | null;
}): InvitationNoticeEvaluation {
  const requiredDays = requiredNoticeDaysForMeetingType(input.type);
  if (!input.invitationSentAt) {
    return { status: "not_sent", requiredDays, actualDays: null };
  }

  const meetingUtc = Date.UTC(
    input.meetingDate.getUTCFullYear(),
    input.meetingDate.getUTCMonth(),
    input.meetingDate.getUTCDate(),
  );
  const sentUtc = Date.UTC(
    input.invitationSentAt.getUTCFullYear(),
    input.invitationSentAt.getUTCMonth(),
    input.invitationSentAt.getUTCDate(),
  );
  const actualDays = Math.floor((meetingUtc - sentUtc) / 86_400_000);

  return {
    status: actualDays >= requiredDays ? "compliant" : "short_notice",
    requiredDays,
    actualDays,
  };
}
