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
