import { z } from "zod";

import { defineNotificationType, defineNotificationTypes } from "@/shared/notifications/define";

import { notificationsPermissions } from "./permissions";

/** N1d (#374): kurum duyurusu (yönetici yazar; herkese veya seçilen rollere). İçerik şifreli; dış kanallara genel metin. */
export const notifications = defineNotificationTypes("notifications", [
  defineNotificationType({
    key: "announcement",
    severity: "info",
    defaultChannels: ["in_app", "email"],
    permission: { definition: notificationsPermissions, action: "view" },
    schema: z.object({ title: z.string().trim().min(1).max(120), body: z.string().trim().max(1000) }).strict(),
    titleKey: "notifications.announcement.title",
    bodyKey: "notifications.announcement.body",
    href: () => "/",
  }),
]);
