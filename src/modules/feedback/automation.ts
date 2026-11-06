import "server-only";

import { z } from "zod";

import { defineEvent } from "@/shared/automation/define";

/** Yeni hata/öneri kaydı. Yük yalnızca kimlik ve sınıflandırma taşır. */
export const feedbackCreatedEvent = defineEvent({
  key: "feedback.created",
  description: "feedback.created",
  payloadSchema: z.object({
    feedbackId: z.string().min(1).max(128),
    type: z.enum(["BUG", "SUGGESTION"]),
    priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  }).strict(),
  variables: {
    namespace: "feedback",
    fields: ["number", "title", "pageUrl"],
    load: async (payload): Promise<Record<string, string | number | null>> => {
      const { getDb } = await import("@/shared/db");
      const item = await getDb().feedbackItem.findUnique({ where: { id: payload.feedbackId }, select: { number: true, title: true, pageUrl: true } });
      return item ? { number: item.number, title: item.title, pageUrl: item.pageUrl ?? null } : {};
    },
  },
});
