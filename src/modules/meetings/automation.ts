import "server-only";

import { z } from "zod";

import { defineEvent } from "@/shared/automation/define";

/** Yeni toplantı planlandı. */
export const meetingCreatedEvent = defineEvent({
  key: "meetings.created",
  description: "meetings.created",
  payloadSchema: z.object({
    meetingId: z.string().min(1).max(128),
    type: z.enum(["BOARD", "GENERAL_ASSEMBLY", "COMMITTEE", "OTHER"]),
  }).strict(),
  variables: {
    namespace: "meeting",
    fields: ["meetingNumber", "title", "meetingDate", "startTime", "location"],
    load: async (payload): Promise<Record<string, string | number | null>> => {
      const { getDb } = await import("@/shared/db");
      const meeting = await getDb().meeting.findUnique({
        where: { id: payload.meetingId },
        select: { meetingNumber: true, title: true, meetingDate: true, startTime: true, location: true },
      });
      if (!meeting) return {};
      return {
        meetingNumber: meeting.meetingNumber,
        title: meeting.title,
        meetingDate: meeting.meetingDate.toISOString().slice(0, 10),
        startTime: meeting.startTime ?? null,
        location: meeting.location ?? null,
      };
    },
  },
});
