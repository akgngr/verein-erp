import "server-only";
import { z } from "zod";
import { defineTask } from "@/shared/automation/define";

/** Administrator schedules cleanup with the existing automation scheduler. */
export const aiCleanupTask = defineTask({
  key: "ai.cleanup_history",
  version: 1,
  description: "ai.cleanup_history",
  inputSchema: z.object({}).strict(),
  timeoutSeconds: 120,
  retry: { maxAttempts: 3, initialDelaySeconds: 30, maxDelaySeconds: 300, backoffMultiplier: 2 },
  schedule: { input: () => ({}), minIntervalMinutes: 60 },
  idempotencyKey: () => `ai:cleanup:${Math.floor(Date.now() / 3_600_000)}`,
  handler: async () => {
    const { cleanupAiHistory } = await import("./services/cleanup");
    return cleanupAiHistory();
  },
});
