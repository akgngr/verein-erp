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
