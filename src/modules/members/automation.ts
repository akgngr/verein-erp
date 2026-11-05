import "server-only";

import { z } from "zod";

import { defineEvent } from "@/shared/automation/define";

/** Yeni üye kaydı. Yük yalnızca kimlik ve kişisel olmayan alanlar taşır. */
export const memberCreatedEvent = defineEvent({
  key: "members.created",
  description: "members.created",
  payloadSchema: z.object({
    memberId: z.string().min(1).max(128),
    type: z.string().max(40),
    status: z.string().max(40),
  }).strict(),
});
