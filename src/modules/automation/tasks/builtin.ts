import "server-only";

import { z } from "zod";

import { defineTask } from "@/shared/automation/define";

/**
 * Automation's own trusted tasks. Not discovered via automation.ts (that file
 * is the module's narrow API), so the registry adds them explicitly.
 */
export const logMessageTask = defineTask({
  key: "automation.log_message",
  version: 1,
  description: "automation.log_message",
  inputSchema: z.object({ message: z.string().trim().min(1).max(500) }).strict(),
  timeoutSeconds: 30,
  retry: { maxAttempts: 1, initialDelaySeconds: 0, maxDelaySeconds: 0, backoffMultiplier: 1 },
  workflow: { defaultInput: { message: "" } },
  handler: async (input, context) => {
    const { recordAutomationLog } = await import("../services/log-store");
    await recordAutomationLog({ executionId: context.executionId, event: "WORKFLOW_MESSAGE", message: input.message });
    return { logged: true };
  },
});

export const builtinTasks = [logMessageTask] as const;
