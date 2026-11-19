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

/**
 * S4.2 (#314): takip hatırlatmaları. Mevcut pg-boss zamanlayıcısıyla 15 dakikada bir; yalnız durum ilerletir
 * (hatırlatma özetinde görünür). Dış mesaj yok, kaynak değişmez; aynı gün ikinci hatırlatma yok.
 */
export const followUpRemindersTask = defineTask({
  key: "secretary.follow_up_reminders",
  version: 1,
  description: "secretary.follow_up_reminders",
  inputSchema: z.object({}).strict(),
  timeoutSeconds: 300,
  retry: { maxAttempts: 1, initialDelaySeconds: 0, maxDelaySeconds: 0, backoffMultiplier: 1 },
  schedule: { input: () => ({}), minIntervalMinutes: 15, automaticIntervalMinutes: 15 },
  idempotencyKey: () => `secretary:follow-ups:${Math.floor(Date.now() / 900_000)}`,
  handler: async () => {
    const { runFollowUpReminders } = await import("./services/follow-ups");
    const { getUserById } = await import("@/modules/users/automation");
    const { getDb } = await import("@/shared/db");
    return runFollowUpReminders(new Date(), {
      loadUser: async (userId) => {
        const user = await getUserById(userId);
        return user ? { id: user.id, role: user.role, isActive: user.isActive } : null;
      },
      loadQuietHours: (userId) => getDb().secretaryPreference.findUnique({ where: { userId }, select: { quietFrom: true, quietTo: true } }),
    });
  },
});
