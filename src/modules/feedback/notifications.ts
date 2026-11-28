import { z } from "zod";

import { defineNotificationType, defineNotificationTypes } from "@/shared/notifications/define";

import { feedbackPermissions } from "./permissions";

export const notifications = defineNotificationTypes("feedback", [
  defineNotificationType({
    key: "replied",
    severity: "info",
    defaultChannels: ["in_app", "email"],
    permission: { definition: feedbackPermissions, action: "view" },
    schema: z
      .object({
        feedbackId: z.string().min(1).max(64),
        number: z.string().max(40),
        status: z.string().max(32),
      })
      .strict(),
    titleKey: "notifications.replied.title",
    bodyKey: "notifications.replied.body",
    href: (p) => `/geri-bildirim/${p.feedbackId}`,
  }),
]);
