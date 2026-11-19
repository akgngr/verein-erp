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

const WEEKLY_REPORT_RETRY = { maxAttempts: 2, initialDelaySeconds: 30, maxDelaySeconds: 120, backoffMultiplier: 2 } as const;

/**
 * S5.1 (#315): haftalık kurul raporu PDF'i. Files hattının üretim görevi (yalnız `generationId` girdisi);
 * kuyruk/retry/lease mevcut Automation altyapısındadır. Rapor yalnız sayılar içerir.
 */
export const weeklyReportTask = defineTask({
  key: "secretary.weekly_report",
  version: 1,
  description: "secretary.weekly_report",
  inputSchema: z.object({ generationId: z.string().min(1).max(128) }).strict(),
  timeoutSeconds: 120,
  retry: WEEKLY_REPORT_RETRY,
  idempotencyKey: (input) => `secretary-weekly-report:${input.generationId}`,
  handler: async (input, context) => {
    const runner = await import("./services/weekly-report-runner");
    try {
      return await runner.runWeeklyReport(input.generationId, context);
    } catch (error) {
      return runner.failWeeklyReportAttempt(input.generationId, context, error, WEEKLY_REPORT_RETRY.maxAttempts);
    }
  },
});
