import "server-only";

import { z } from "zod";

import { defineTask } from "@/shared/automation/define";

/**
 * § 72a Abs. 5 SGB VIII uyarınca günlük yasal silinme görevi (worker-safe).
 * Faaliyeti sonlanmış kişilerin kayıtlarını 3 ay sonra otomatik olarak hard-delete eder.
 */
export const statutoryPurgeTask = defineTask({
  key: "youth-protection.statutory_purge",
  version: 1,
  description: "youth-protection.statutory_purge",
  inputSchema: z.object({}).strict(),
  timeoutSeconds: 120,
  retry: { maxAttempts: 2, initialDelaySeconds: 30, maxDelaySeconds: 120, backoffMultiplier: 2 },
  schedule: { input: () => ({}), minIntervalMinutes: 60, automaticIntervalMinutes: 24 * 60 },
  idempotencyKey: () => `youth-protection:purge:${new Date().toISOString().slice(0, 10)}`,
  handler: async () => {
    const { purgeStatutoryRecords } = await import("./services/statutory-purge");
    const result = await purgeStatutoryRecords();
    return { deletedCount: result.deletedCount };
  },
});
