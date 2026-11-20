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
  // N6 (#363): günlük özet artık merkezi bildirim sistemiyle teslim edilir (kanallar kullanıcının bildirim tercihinden).
  defineNotificationType({
    key: "daily-digest",
    severity: "info",
    defaultChannels: ["in_app"],
    permission: { definition: secretaryPermissions, action: "view" },
    schema: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), total: z.number().int().min(0), danger: z.number().int().min(0), warning: z.number().int().min(0) }).strict(),
    titleKey: "notifications.dailyDigest.title",
    bodyKey: "notifications.dailyDigest.body",
    href: () => "/sekreter",
    // Yalnız sayılar ve tarih (kişisel veri yok).
    externalText: (params, locale) => locale === "de"
      ? `Tagesübersicht ${params.date}: ${params.total} Einträge (${params.danger} dringend, ${params.warning} Achtung)`
      : `Günlük özet ${params.date}: ${params.total} kayıt (${params.danger} acil, ${params.warning} dikkat)`,
  }),
]);
