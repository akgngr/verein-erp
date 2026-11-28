"use server";

import { revalidatePath } from "next/cache";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";
import { notify } from "@/modules/notifications/automation";

import { feedbackPermissions } from "../permissions";
import { feedbackUpdateSchema } from "../schemas/feedback";

/** Yönetici: durum, öncelik ve cevap (cevap testçiye kendi listesinde görünür). */
export async function updateFeedbackAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: feedbackPermissions, action: "approve" },
    schema: feedbackUpdateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const existing = await db.feedbackItem.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("feedback.errors.notFound");
      const replyChanged = (existing.adminReply ?? "") !== input.reply;
      const statusChanged = existing.status !== input.status;
      await db.feedbackItem.update({
        where: { id: input.id },
        data: {
          status: input.status,
          priority: input.priority,
          adminReply: input.reply || null,
          ...(replyChanged ? { repliedAt: input.reply ? new Date() : null, repliedByLabel: input.reply ? buildUserLabel(user.name, user.email) : null } : {}),
        },
      });
      await audit({ action: "UPDATE", entity: "FeedbackItem", entityId: input.id, before: { status: existing.status, priority: existing.priority }, after: { status: input.status, priority: input.priority, replied: replyChanged } });
      if (
        existing.reporterId &&
        existing.reporterId !== user.id &&
        ((replyChanged && Boolean(input.reply)) || statusChanged)
      ) {
        await notify({
          type: "feedback.replied",
          recipients: [existing.reporterId],
          ref: `feedback:${existing.id}:u:${Date.now()}`,
          params: { id: existing.id, number: existing.number },
        }).catch(() => 0);
      }
      revalidatePath("/geri-bildirim");
      revalidatePath(`/geri-bildirim/${input.id}`);
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
