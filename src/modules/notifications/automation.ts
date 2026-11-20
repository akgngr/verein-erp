import "server-only";

import { z } from "zod";

import { defineTask } from "@/shared/automation/define";

// notifications modülü — worker/otomasyon girişi. Diğer modüller bildirim göndermek için `notify`'ı buradan alır.
export { notify } from "./services/inbox";

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
