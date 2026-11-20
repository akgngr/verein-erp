import { z } from "zod";

import { defineNotificationType, defineNotificationTypes } from "@/shared/notifications/define";

import { meetingsPermissions } from "./permissions";

/** N1c (#356): kullanıcı bir toplantıya katılımcı olarak eklendiğinde. */
export const notifications = defineNotificationTypes("meetings", [
  defineNotificationType({
    key: "invited",
    severity: "info",
    defaultChannels: ["in_app", "email"],
    permission: { definition: meetingsPermissions, action: "view" },
    schema: z.object({ meetingId: z.string().min(1).max(64), title: z.string().max(200) }).strict(),
    titleKey: "notifications.invited.title",
    bodyKey: "notifications.invited.body",
    href: (params) => (/^[A-Za-z0-9_-]{1,64}$/.test(params.meetingId) ? `/toplantilar/${params.meetingId}` : "/toplantilar"),
  }),
]);
