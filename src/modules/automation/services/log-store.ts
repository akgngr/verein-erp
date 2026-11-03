import "server-only";

import type { Prisma } from "@prisma/client";
import { getDb } from "@/shared/db";

export type AutomationLogLevel = "INFO" | "WARN" | "ERROR";

export async function recordAutomationLog(input: {
  executionId: string;
  level?: AutomationLogLevel;
  event: string;
  message: string;
  details?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await getDb().automationLog.create({
      data: {
        executionId: input.executionId,
        level: input.level ?? "INFO",
        event: input.event.slice(0, 80),
        message: input.message.slice(0, 1000),
        details: input.details,
      },
    });
  } catch (error) {
    // Logging must never change the outcome of the job itself.
    console.error("[automation] Could not persist execution log:", error);
  }
}
