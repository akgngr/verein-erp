import "server-only";

import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { getModuleAvailability } from "@/modules/system/automation";
import { taskModuleKey, type TaskDefinition } from "@/shared/automation/define";
import { getDb } from "@/shared/db";

import { createTaskExecutionRecord } from "./execution-store";
import { recordAutomationLog } from "./log-store";

const TERMINAL = ["SUCCEEDED", "FAILED", "CANCELLED"] as const;

export type EnqueueTaskOptions = {
  requestedById?: string | null;
  organizationId?: string;
  /** Module that requests the work; defaults to the task's owning module. */
  sourceModule?: string;
  correlationId?: string;
  locale?: "tr" | "de";
  scheduledAt?: Date;
  /** Overrides the task's idempotency key (e.g. per schedule slot). */
  idempotencyKey?: string;
};

/** Throws when the owning or requesting module is inactive or unapproved. */
export async function assertTaskModulesUsable(taskKey: string, sourceModule?: string): Promise<void> {
  const modules = new Set([taskModuleKey(taskKey), "automation", ...(sourceModule ? [sourceModule] : [])]);
  for (const key of modules) {
    if (await getModuleAvailability(key) !== "available") {
      throw new Error("AUTOMATION_MODULE_UNAVAILABLE");
    }
  }
}

/**
 * Public enqueue API. Verifies module availability before the execution and
 * outbox rows are written. Callers check user permissions in their own action.
 */
export async function enqueueTask<TSchema extends z.ZodType>(
  task: TaskDefinition<TSchema>,
  input: z.input<TSchema>,
  options: EnqueueTaskOptions = {},
) {
  const sourceModule = options.sourceModule ?? taskModuleKey(task.key);
  await assertTaskModulesUsable(task.key, sourceModule);
  return createTaskExecutionRecord({
    task,
    organizationId: options.organizationId ?? "default",
    requestedById: options.requestedById ?? null,
    sourceModule,
    correlationId: options.correlationId ?? `${sourceModule}:${crypto.randomUUID()}`,
    input: input as Prisma.InputJsonValue,
    context: { locale: options.locale ?? "de" },
    scheduledAt: options.scheduledAt,
    idempotencyKey: options.idempotencyKey,
  });
}

export async function getExecution(executionId: string, organizationId = "default") {
  return getDb().automationExecution.findFirst({
    where: { id: executionId, organizationId },
    include: {
      steps: { orderBy: { createdAt: "asc" } },
      logs: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
}

/**
 * Cancel a non-terminal execution. A RUNNING worker loses its lease on the next
 * heartbeat (status is no longer RUNNING), aborts its signal and cannot write a
 * terminal state afterwards thanks to the fencing conditions.
 */
export async function cancelExecution(executionId: string, reason: string, actorId: string | null) {
  const now = new Date();
  const cancelled = await getDb().$transaction(async (tx) => {
    const update = await tx.automationExecution.updateMany({
      where: { id: executionId, status: { notIn: [...TERMINAL] } },
      data: {
        status: "CANCELLED",
        finishedAt: now,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastErrorCode: "CANCELLED",
      },
    });
    if (update.count === 0) return false;
    await tx.automationStepRun.updateMany({
      where: { executionId, status: { notIn: ["SUCCEEDED", "FAILED", "CANCELLED"] } },
      data: { status: "CANCELLED", finishedAt: now, lastErrorCode: "CANCELLED" },
    });
    await tx.automationOutbox.updateMany({
      where: { executionId, status: { in: ["PENDING", "PROCESSING"] } },
      data: { status: "FAILED", lastErrorCode: "EXECUTION_CANCELLED", claimOwner: null, claimExpiresAt: null },
    });
    return true;
  });
  if (!cancelled) throw new Error("AUTOMATION_NOT_CANCELLABLE");
  await recordAutomationLog({
    executionId,
    level: "WARN",
    event: "EXECUTION_CANCELLED",
    message: reason.slice(0, 500),
    details: { actorId },
  });
}

/**
 * Manually retry a FAILED or CANCELLED execution with a fresh attempt budget.
 * The same execution row is reused so history and idempotency stay intact.
 */
export async function retryExecution(executionId: string, actorId: string | null) {
  const db = getDb();
  const execution = await db.automationExecution.findUnique({
    where: { id: executionId },
    select: { status: true, definitionKey: true, definitionVersion: true, sourceModule: true },
  });
  if (!execution || (execution.status !== "FAILED" && execution.status !== "CANCELLED")) {
    throw new Error("AUTOMATION_NOT_RETRYABLE");
  }
  await assertTaskModulesUsable(execution.definitionKey, execution.sourceModule);

  const now = new Date();
  const retried = await db.$transaction(async (tx) => {
    const update = await tx.automationExecution.updateMany({
      where: { id: executionId, status: execution.status },
      data: {
        status: "PENDING",
        attempt: 0,
        startedAt: null,
        finishedAt: null,
        heartbeatAt: null,
        leaseOwner: null,
        leaseExpiresAt: null,
        scheduledAt: null,
        lastErrorCode: null,
      },
    });
    if (update.count === 0) return false;
    await tx.automationStepRun.updateMany({
      where: { executionId },
      data: { status: "PENDING", attempt: 0, startedAt: null, finishedAt: null, lastErrorCode: null },
    });
    await tx.automationOutbox.create({
      data: {
        eventKey: `automation.task.retry:${executionId}:${now.getTime()}`,
        eventType: "automation.task.requested",
        executionId,
        availableAt: now,
        payload: {
          executionId,
          taskKey: execution.definitionKey,
          taskVersion: execution.definitionVersion,
        },
      },
    });
    return true;
  });
  if (!retried) throw new Error("AUTOMATION_NOT_RETRYABLE");
  await recordAutomationLog({
    executionId,
    event: "EXECUTION_RETRY_REQUESTED",
    message: execution.definitionKey,
    details: { actorId },
  });
}
