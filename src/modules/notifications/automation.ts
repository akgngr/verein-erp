import "server-only";

import { z } from "zod";

import { defineTask } from "@/shared/automation/define";

// notifications modülü — worker/otomasyon girişi. Diğer modüller bildirim göndermek için `notify`'ı buradan alır.
export { notify } from "./services/inbox";
// N6 (#363): sekreter geçişi (yalnız eksik kayıtları oluşturur).
export { ensurePreference } from "./services/preferences";
export { importVerifiedChannelLink } from "./services/telegram";

/** Saklama (ADR 0006): 90 günden eski bildirimler günde bir silinir. */
export const purgeNotificationsTask = defineTask({
  key: "notifications.purge",
  version: 1,
  description: "notifications.purge",
  inputSchema: z.object({}).strict(),
  timeoutSeconds: 120,
  retry: { maxAttempts: 2, initialDelaySeconds: 60, maxDelaySeconds: 300, backoffMultiplier: 2 },
  schedule: { input: () => ({}), minIntervalMinutes: 60, automaticIntervalMinutes: 24 * 60 },
  idempotencyKey: () => `notifications:purge:${new Date().toISOString().slice(0, 10)}`,
  handler: async () => {
    const { purgeExpired } = await import("./services/inbox");
    return { removed: await purgeExpired() };
  },
});

/** N2a (#357): dış kanal dağıtımı (e-posta; anında veya günlük özet). Mevcut zamanlayıcı, 5 dakikada bir. */
export const dispatchNotificationsTask = defineTask({
  key: "notifications.dispatch",
  version: 1,
  description: "notifications.dispatch",
  inputSchema: z.object({}).strict(),
  timeoutSeconds: 240,
  retry: { maxAttempts: 1, initialDelaySeconds: 0, maxDelaySeconds: 0, backoffMultiplier: 1 },
  schedule: { input: () => ({}), minIntervalMinutes: 5, automaticIntervalMinutes: 5 },
  idempotencyKey: () => `notifications:dispatch:${Math.floor(Date.now() / 300_000)}`,
  handler: async () => {
    const { runDispatch, defaultDispatchDeps } = await import("./services/dispatch");
    return runDispatch(new Date(), await defaultDispatchDeps());
  },
});

/**
 * N6b (#363): iş akışı düğümü "Bildirim gönder" — kurum duyurusu türüyle herkese veya seçilen rollere.
 * Metin iş akışı değişkenleriyle yalnız gönderim anında doldurulur; içerik şifreli saklanır; dış kanallara genel metin.
 */
export const sendNotificationTask = defineTask({
  key: "notifications.send",
  version: 1,
  description: "notifications.send",
  inputSchema: z.object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().max(1000).default(""),
    roles: z.array(z.string().regex(/^[A-Za-z0-9_-]{1,40}$/)).max(50).default([]),
  }).strict(),
  timeoutSeconds: 120,
  retry: { maxAttempts: 3, initialDelaySeconds: 30, maxDelaySeconds: 600, backoffMultiplier: 2 },
  workflow: { defaultInput: { title: "", body: "", roles: [] } },
  handler: async (input, context) => {
    const { renderWorkflowVariables } = await import("@/shared/automation/variables");
    const text = await renderWorkflowVariables(context.executionId, { title: input.title, body: input.body });
    const { notify } = await import("./services/inbox");
    const recipients = await notify({
      type: "notifications.announcement",
      audience: input.roles.length ? { roles: input.roles } : { allWithPermission: true },
      ref: `workflow:${context.executionId}`,
      params: { title: text.title.slice(0, 120), body: text.body.slice(0, 1000) },
    });
    return { recipients };
  },
});
