import "server-only";

import { z } from "zod";

import { defineTask } from "@/shared/automation/define";

/**
 * Günlük sabah özeti (T3.1). Her 15 dakikada bir çalışır; kullanıcının saatine (Europe/Berlin) göre
 * zamanı gelenler için özeti bir kez hazırlar. Sessiz saatlerde bildirim yok; aynı gün tekrar yok.
 */
export const dailyBriefingTask = defineTask({
  key: "secretary.daily_briefing",
  version: 1,
  description: "secretary.daily_briefing",
  inputSchema: z.object({}).strict(),
  timeoutSeconds: 300,
  retry: { maxAttempts: 1, initialDelaySeconds: 0, maxDelaySeconds: 0, backoffMultiplier: 1 },
  schedule: { input: () => ({}), minIntervalMinutes: 15, automaticIntervalMinutes: 15 },
  idempotencyKey: () => `secretary:daily-briefing:${Math.floor(Date.now() / 900_000)}`,
  handler: async () => {
    const { runScheduledBriefings } = await import("./services/daily-briefing-runner");
    return runScheduledBriefings(new Date());
  },
});
