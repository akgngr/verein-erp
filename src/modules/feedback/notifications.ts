import { z } from "zod";

import {
  defineNotificationType,
  defineNotificationTypes,
} from "@/shared/notifications/define";

import { feedbackPermissions } from "./permissions";

/** Geri bildirime yönetici yanıt verdiğinde veya durumu güncellediğinde bildiren kişiye bildirim. */
export const notifications = defineNotificationTypes("feedback", [
  defineNotificationType({
    key: "replied",
    severity: "info",
    defaultChannels: ["in_app"],
    permission: { definition: feedbackPermissions, action: "view" },
    schema: z
      .object({
        id: z.string().min(1).max(64),
        number: z.number().int().positive(),
      })
      .strict(),
    titleKey: "notifications.replied.title",
    bodyKey: "notifications.replied.body",
    href: (params) => `/geri-bildirim/${params.id}`,
  }),
]);
