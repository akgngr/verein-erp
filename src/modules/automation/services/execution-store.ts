import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";\nimport { getAutomationRuntimeConfig } from "../runtime-config";

export type CreateTaskExecutionRecordInput = {
  taskKey: string;
  taskVersion: number;
  organizationId: string;
  requestedById?: string | null;
  sourceModule: string;
  correlationId: string;
  idempotencyKey?: string;
  input: Prisma.InputJsonValue;
  context?: Prisma.InputJsonValue;
  maxAttempts?: number;
  scheduledAt?: Date;
};

/**
 * Persist execution and dispatch intent atomically.
 *
 * This is an internal persistence primitive, not a public enqueue API. Callers must perform
 * actor permission checks and module-availability checks before invoking it. A separate worker
 * process will publish the outbox event to pg-boss.
 */
export async function createTaskExecutionRecord(input: CreateTaskExecutionRecordInput) {
  return getDb().$transaction(async (tx) => {
    const execution = await tx.automationExecution.create({
      data: {
        kind: "TASK",
        status: "PENDING",
        definitionKey: input.taskKey,
        definitionVersion: input.taskVersion,
        organizationId: input.organizationId,
        requestedById: input.requestedById ?? null,
        sourceModule: input.sourceModule,
        correlationId: input.correlationId,
        idempotencyKey: input.idempotencyKey ?? null,
        input: input.input,
        context: input.context ?? {},
        maxAttempts: input.maxAttempts ?? 3,
        scheduledAt: input.scheduledAt,
        steps: {
          create: {
            stepKey: "main",
            taskKey: input.taskKey,
            taskVersion: input.taskVersion,
            status: "PENDING",
            input: input.input,
            maxAttempts: input.maxAttempts ?? 3,
          },
        },
      },
      select: { id: true },
    });

    await tx.automationOutbox.create({
      data: {
        eventKey: `automation.task.requested:${execution.id}`,
        eventType: "automation.task.requested",
        executionId: execution.id,
        payload: {
          executionId: execution.id,
          taskKey: input.taskKey,
          taskVersion: input.taskVersion,
        },
      },
    });

    return execution;
  });
}

export async function getTaskExecutionRecord(id: string, organizationId: string) {
  return getDb().automationExecution.findFirst({
    where: { id, organizationId },
    include: { steps: { orderBy: { createdAt: "asc" } } },
  });
}
