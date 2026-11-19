import { z } from "zod";

import { BRIEFING_ITEM_ID_PATTERN } from "@/shared/secretary/define";

/** En uzun erteleme: 90 gün. Daha uzunu "kapat" ile yapılır. */
export const MAX_SNOOZE_DAYS = 90;

const itemId = z.string().regex(BRIEFING_ITEM_ID_PATTERN, "secretary.validation.itemId");

export const itemRefSchema = z.object({ itemId });

export const snoozeSchema = z.object({
  itemId,
  until: z.iso.datetime({ offset: true, message: "secretary.validation.until" }),
});

export const proposalConfirmSchema = z.object({
  id: z.string().min(1).max(64),
  /** Dışa etkili eylemlerde UI'daki ek onay. */
  confirmExternal: z.boolean().optional(),
});

export const proposalRefSchema = z.object({ id: z.string().min(1).max(64) });

export const proposalSnoozeSchema = z.object({
  id: z.string().min(1).max(64),
  until: z.iso.datetime({ offset: true, message: "secretary.validation.until" }),
});
