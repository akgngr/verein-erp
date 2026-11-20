"use server";

import { randomUUID } from "node:crypto";

import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";

import { notificationsPermissions } from "../permissions";
import { notify, NotificationError } from "../services/inbox";

/**
 * N1d (#374): kurum duyurusu. Yalnız yönetici (`notifications.update`). Kitle: herkes (türü görebilen tüm etkin
 * kullanıcılar) veya seçilen roller. Denetime içerik yazılmaz; yalnız kitle ve alıcı sayısı.
 */
export async function createAnnouncementAction(input: unknown): Promise<ActionResult<{ recipients: number }>> {
  return createAction({
    permission: { definition: notificationsPermissions, action: "update" },
    schema: z.object({
      title: z.string().trim().min(1).max(120),
      body: z.string().trim().max(1000).default(""),
      roles: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,40}$/)).max(50).optional(),
    }).strict(),
    handler: async ({ input, audit }) => {
      const id = randomUUID();
      try {
        const recipients = await notify({
          type: "notifications.announcement",
          audience: input.roles?.length ? { roles: input.roles } : { allWithPermission: true },
          ref: `announcement:${id}`,
          params: { title: input.title, body: input.body },
        });
        await audit({ action: "CREATE", entity: "NotificationAnnouncement", entityId: id, after: { audience: input.roles?.length ? input.roles : "all", recipients } });
        return { recipients };
      } catch (error) {
        if (error instanceof NotificationError) throw new ActionError("notifications.errors.announcementFailed");
        throw error;
      }
    },
  })(input);
}
