import "server-only";

import { Prisma } from "@prisma/client";
import type { TaskDefinition, TaskExecutionContext } from "@/shared/automation/define";
import { getDb } from "@/shared/db";
import { automationTasks } from "../tasks/registry";
import { recordAutomationLog } from "./log-store";
import type { AutomationTaskQueuePayload } from "../worker/queue";

// Keep the lease longer than the maximum task timeout so long mailing batches are not reclaimed.
const RUNNING_STALE_AFTER_MS = 2 * 60 * 60 * 1000;
const registeredTasks = automationTasks as unknown as readonly TaskDefinition[];

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code.slice(0, 80);
  }
  if (error instanceof Error && error.message === "TASK_TIMEOUT") return "TASK_TIMEOUT";
  return error instanceof Error ? error.name.slice(0, 80) : "TASK_FAILED";
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function markTerminal(
  executionId: string,
  status: "FAILED" | "SUCCEEDED",
  code: string | null,
  result?: unknown,
): Promise<void> {
  const db = getDb();
  const storedResult = result == null
    ? Prisma.JsonNull
    : JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue;

  await db.$transaction([
    db.automationExecution.updateMany({
      where: { id: executionId, status: "RUNNING" },
      data: {
        status,
        finishedAt: new Date(),
        lastErrorCode: code,
      },
    }),
    db.automationStepRun.updateMany({
      where: { executionId, stepKey: "main", status: "RUNNING" },
      data: {
        status,
        finishedAt: new Date(),
        lastErrorCode: code,
        ...(status === "SUCCEEDED" ? { result: storedResult } : {}),
      },
    }),
  ]);
  await recordAutomationLog({
    executionId,
    level: status === "FAILED" ? "ERROR" : "INFO",
    event: status === "FAILED" ? "EXECUTION_FAILED" : "EXECUTION_SUCCEEDED",
    message: status === "FAILED" ? `Task failed: ${code ?? "TASK_FAILED"}` : "Task completed successfully.",
    details: { status, errorCode: code },
  });
}

/**
 * Claim and execute one trusted task.
 *
 * The task registry is application code only. Queue data selects a registered key;
 * it can never provide an import path or executable handler.
 */
export async function executeAutomationTask(payload: AutomationTaskQueuePayload): Promise<void> {
  const db = getDb();
  const existing = await db.automationExecution.findUnique({
    where: { id: payload.executionId },
    include: { steps: true },
  });

  if (!existing || ["SUCCEEDED", "FAILED", "CANCELLED"].includes(existing.status)) return;
  if (existing.definitionKey !== payload.taskKey || existing.definitionVersion !== payload.taskVersion) {
    await db.automationExecution.updateMany({
      where: { id: payload.executionId, status: { in: ["PENDING", "RUNNING"] } },
      data: { status: "FAILED", finishedAt: new Date(), lastErrorCode: "TASK_ENVELOPE_MISMATCH" },
    });
    await db.automationStepRun.updateMany({
      where: { executionId: payload.executionId, stepKey: "main", status: { in: ["PENDING", "RUNNING", "RETRYING"] } },
      data: { status: "FAILED", finishedAt: new Date(), lastErrorCode: "TASK_ENVELOPE_MISMATCH" },
    });
    return;
  }

  const staleBefore = new Date(Date.now() - RUNNING_STALE_AFTER_MS);
  const claimed = await db.$transaction(async (tx) => {
    const update = await tx.automationExecution.updateMany({
      where: {
        id: payload.executionId,
        OR: [
          { status: "PENDING" },
          { status: "RUNNING", startedAt: { lt: staleBefore } },
        ],
      },
      data: {
        status: "RUNNING",
        attempt: { increment: 1 },
        startedAt: new Date(),
        finishedAt: null,
        lastErrorCode: null,
      },
    });

    if (update.count === 0) return false;

    await tx.automationStepRun.updateMany({
      where: { executionId: payload.executionId, stepKey: "main" },
      data: {
        status: "RUNNING",
        attempt: { increment: 1 },
        startedAt: new Date(),
        finishedAt: null,
        lastErrorCode: null,
      },
    });
    return true;
  });

  if (!claimed) return;

  // Use the record loaded before the atomic claim. The claim increments the persisted
  // attempt, so the current attempt is the previous value + 1.
  const execution = existing;
  const attempt = execution.attempt + 1;

  // Everything after claiming must be inside this try/catch. In particular, this worker
  // runs outside a Next.js request and must not depend on next-intl request context.
  try {
    await recordAutomationLog({
      executionId: execution.id,
      event: "ATTEMPT_STARTED",
      message: `Task started (attempt ${attempt}/${execution.maxAttempts}).`,
      details: { attempt, maxAttempts: execution.maxAttempts, taskKey: execution.definitionKey },
    });
  if (attempt > execution.maxAttempts) {
    await markTerminal(payload.executionId, "FAILED", "TASK_ATTEMPTS_EXHAUSTED");
    return;
  }

  const task = registeredTasks.find((item) => item.key === payload.taskKey);

  if (!task) {
    await markTerminal(payload.executionId, "FAILED", "TASK_NOT_REGISTERED");
    return;
  }
  if (task.version !== payload.taskVersion) {
    await markTerminal(payload.executionId, "FAILED", "TASK_VERSION_NOT_REGISTERED");
    return;
  }

  const parsedInput = task.inputSchema.safeParse(execution.input);
  if (!parsedInput.success) {
    await markTerminal(payload.executionId, "FAILED", "TASK_INPUT_INVALID");
    return;
  }

  const storedContext = asObject(execution.context);
  const controller = new AbortController();
  const timeoutSeconds = task.timeoutSeconds ?? 300;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  const context: TaskExecutionContext = {
    executionId: execution.id,
    taskRunId: execution.steps[0]?.id ?? execution.id,
    requestedById: execution.requestedById,
    organizationId: execution.organizationId,
    correlationId: execution.correlationId,
    locale: storedContext.locale === "tr" ? "tr" : "de",
    attempt,
    signal: controller.signal,
  };

    const handler = task.handler(parsedInput.data, context);
    const timedOut = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error("TASK_TIMEOUT"));
      }, timeoutSeconds * 1000);
    });
    const result = await Promise.race([handler, timedOut]);
    await markTerminal(payload.executionId, "SUCCEEDED", null, result);
  } catch (error) {
    const code = errorCode(error);
    await recordAutomationLog({
      executionId: payload.executionId,
      level: "ERROR",
      event: attempt >= execution.maxAttempts ? "ATTEMPT_FAILED_FINAL" : "ATTEMPT_FAILED_RETRYING",
      message: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
      details: { errorCode: code, attempt, maxAttempts: execution.maxAttempts },
    });
    if (attempt >= execution.maxAttempts) {
      await markTerminal(payload.executionId, "FAILED", code);
      return;
    }

    await db.$transaction([
      db.automationExecution.updateMany({
        where: { id: payload.executionId, status: "RUNNING" },
        data: { status: "PENDING", startedAt: null, lastErrorCode: code },
      }),
      db.automationStepRun.updateMany({
        where: { executionId: payload.executionId, stepKey: "main", status: "RUNNING" },
        data: { status: "RETRYING", startedAt: null, lastErrorCode: code },
      }),
    ]);

    throw new Error(code);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
