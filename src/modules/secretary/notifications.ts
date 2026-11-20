import { z } from "zod";

import { defineNotificationType, defineNotificationTypes } from "@/shared/notifications/define";

import { secretaryPermissions } from "./permissions";

/** N1c (#356): kullanıcı için yeni onay bekleyen sekreter önerisi (içerik yok; önizleme sekreter sayfasında). */
export const notifications = defineNotificationTypes("secretary", [
  defineNotificationType({
    key: "proposal",
    severity: "info",
    defaultChannels: ["in_app"],
    permission: { definition: secretaryPermissions, action: "view" },
    schema: z.object({}).strict(),
    titleKey: "notifications.proposal.title",
    bodyKey: "notifications.proposal.body",
    href: () => "/sekreter",
  }),
]);
