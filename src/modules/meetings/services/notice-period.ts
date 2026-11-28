import type { MeetingType } from "@prisma/client";

import { berlinToday } from "../utils";

/**
 * Guideline invitation lead times (calendar days). The binding period is set by the
 * association's bylaws (Satzung); the BGB itself prescribes none. Shown internally as a
 * reminder only and never printed on the invitation.
 * - General assembly (Mitgliederversammlung): 14 days
 * - Board meeting (Vorstandssitzung): 7 days
 * - Committee / Other: 3 days
 */
export const DEFAULT_NOTICE_DAYS_BY_TYPE: Record<MeetingType, number> = {
  GENERAL_ASSEMBLY: 14,
  BOARD: 7,
  COMMITTEE: 3,
  OTHER: 3,
};

export type NoticePeriodStatus = "compliant" | "short_notice" | "not_sent";

export interface NoticePeriodEvaluation {
  requiredDays: number;
  actualDays: number | null;
  status: NoticePeriodStatus;
}

function toUtcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
      86_400_000,
  );
}

/**
 * Compares the invitation lead time with the guideline. `meetingDate` is a date-only value
 * (UTC midnight); the sending day is the Europe/Berlin calendar day of `invitationSentAt`.
 */
export function evaluateInvitationNoticePeriod(input: {
  meetingType: MeetingType;
  meetingDate: Date;
  invitationSentAt: Date | null | undefined;
  minNoticeDays?: number;
}): NoticePeriodEvaluation {
  const requiredDays =
    input.minNoticeDays !== undefined
      ? Math.max(0, Math.floor(input.minNoticeDays))
      : DEFAULT_NOTICE_DAYS_BY_TYPE[input.meetingType];

  if (!input.invitationSentAt) {
    return { requiredDays, actualDays: null, status: "not_sent" };
  }

  const actualDays =
    toUtcDayNumber(input.meetingDate) - toUtcDayNumber(berlinToday(input.invitationSentAt));

  return {
    requiredDays,
    actualDays,
    status: actualDays >= requiredDays ? "compliant" : "short_notice",
  };
}
