import "server-only";

import { z } from "zod";

import { defineEvent, defineTask } from "@/shared/automation/define";

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

/** Gizli oylama saklaması (RFC-004 §9.4): süresi dolan oylamaların uygunluk kaydı ve oyları günde bir silinir. */
export const purgeExpiredVotesTask = defineTask({
  key: "meetings.vote_purge",
  version: 1,
  description: "meetings.vote_purge",
  inputSchema: z.object({}).strict(),
  timeoutSeconds: 120,
  retry: { maxAttempts: 2, initialDelaySeconds: 60, maxDelaySeconds: 300, backoffMultiplier: 2 },
  schedule: { input: () => ({}), minIntervalMinutes: 60, automaticIntervalMinutes: 24 * 60 },
  idempotencyKey: () => `meetings:vote-purge:${new Date().toISOString().slice(0, 10)}`,
  handler: async () => {
    const { purgeExpiredVotes } = await import("./services/secret-ballot");
    return { votes: await purgeExpiredVotes() };
  },
});
