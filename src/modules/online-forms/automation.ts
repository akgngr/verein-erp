import "server-only";

import { z } from "zod";

import { defineEvent } from "@/shared/automation/define";

/** Online form imzalandı (ör. sekreterliğe bildirim). Kişi bilgisi taşımaz. */
export const onlineFormCompletedEvent = defineEvent({
  key: "online-forms.completed",
  description: "online-forms.completed",
  payloadSchema: z.object({ requestId: z.string().min(1).max(64), kind: z.enum(["MEMBER", "STUDENT", "GUARDIAN"]) }).strict(),
});
