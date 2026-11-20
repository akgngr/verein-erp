import { z } from "zod";

import { defineNotificationType, defineNotificationTypes } from "@/shared/notifications/define";

import { mailInboxPermissions } from "./permissions";
import { TRIAGE_CATEGORIES } from "./services/inbox-triage-rules";

/** N1c (#356): rıza veren kullanıcıya, yanıt/görev önerilebilecek yeni e-posta (yalnız sınıf; gönderen/konu yok). */
export const notifications = defineNotificationTypes("mail", [
  defineNotificationType({
    key: "triage",
    severity: "info",
    defaultChannels: ["in_app"],
    permission: { definition: mailInboxPermissions, action: "view" },
    schema: z.object({ category: z.enum(TRIAGE_CATEGORIES) }).strict(),
    titleKey: "notifications.triage.title",
    bodyKey: "notifications.triage.body",
    href: () => "/mail/gelen-kutusu",
  }),
]);
