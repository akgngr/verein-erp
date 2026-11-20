import { z } from "zod";

import { defineNotificationType, defineNotificationTypes } from "@/shared/notifications/define";

import { tasksPermissions } from "./permissions";

/** N1c (#356): görev, alıcının üye kaydına atandığında (üye e-postası = kullanıcı e-postası). */
export const notifications = defineNotificationTypes("tasks", [
  defineNotificationType({
    key: "assigned",
    severity: "info",
    defaultChannels: ["in_app"],
    permission: { definition: tasksPermissions, action: "view" },
    schema: z.object({ taskId: z.string().min(1).max(64), title: z.string().max(200) }).strict(),
    titleKey: "notifications.assigned.title",
    bodyKey: "notifications.assigned.body",
    href: () => "/tasks/bana-atananlar",
  }),
]);
