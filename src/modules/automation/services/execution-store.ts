import "server-only";

import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { getDb } from "@/shared/db";
import {
  resolveTaskRetryPolicy,
  type TaskDefinition,
} from "@/shared/automation/define";
import { getAutomationRuntimeConfig } from "../runtime-config";

export type CreateTaskExecutionRecordInput<TSchema extends z.ZodType> = {
  task: TaskDefinition<TSchema>;
  organizationId: string;
  requestedById?: string | null;
  sourceModule: string;
  correlationId: string;
  input: Prisma.InputJsonValue;
  context?: Prisma.InputJsonValue;
  scheduledAt?: Date;
};

function isUniqueConstraintError(error: unknown): boolean {
  return error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002";
}

/**
 * Persist execution and dispatch intent atomically.
 *
 * The task definition is the single source of truth for its version, input
 * validation, retry policy and idempotency key. This is an internal persistence
 * primitive, not a public enqueue API: callers must check permissions and module
 * availability before invoking it.
 */
export async function createTaskExecutionRecord<TSchema extends z.ZodType>(
  input: CreateTaskExecutionRecordInput<TSchema>,
) {
  if (!getAutomationRuntimeConfig().enabled) {
    throw new Error("AUTOMATION_DISABLED");
  }

  const parsedInput = input.task.inputSchema.safeParse(input.input);
  if (!parsedInput.success) {
    throw new Error("TASK_INPUT_INVALID");
  }

  const idempotencyKey = input.task.idempotencyKey?.(parsedInput.data) ?? null;
  if (idempotencyKey !== null &&
      (typeof idempotencyKey !== "string" ||
        idempotencyKey.trim().length === 0 ||
        idempotencyKey.length > 255)) {
    throw new Error("TASK_IDEMPOTENCY_KEY_INVALID");
  }

  const retryPolicy = resolveTaskRetryPolicy(input.task.retry);
  const storedInput = JSON.parse(JSON.stringify(parsedInput.data ?? {})) as Prisma.InputJsonValue;
  const db = getDb();

  try {
    return await db.$transaction(async (tx) => {
      const execution = await tx.automationExecution.create({
        data: {
          kind: "TASK",
          status: "PENDING",
          definitionKey: input.task.key,
          definitionVersion: input.task.version,
          organizationId: input.organizationId,
          requestedById: input.requestedById ?? null,
          sourceModule: input.sourceModule,
          correlationId: input.correlationId,
          idempotencyKey,
          input: storedInput,
          context: input.context ?? {},
          retryPolicy: retryPolicy as Prisma.InputJsonValue,
          maxAttempts: retryPolicy.maxAttempts,
          scheduledAt: input.scheduledAt,
          steps: {
            create: {
              stepKey: "main",
              taskKey: input.task.key,
              taskVersion: input.task.version,
              status: "PENDING",
              input: storedInput,
              retryPolicy: retryPolicy as Prisma.InputJsonValue,
              maxAttempts: retryPolicy.maxAttempts,
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
          availableAt: input.scheduledAt ?? new Date(),
          payload: {
            executionId: execution.id,
            taskKey: input.task.key,
            taskVersion: input.task.version,
          },
        },
      });

      return execution;
    });
  } catch (error) {
    // Concurrent requests with the same organization + idempotency key race at
    // the database unique index. Return the committed execution, never create a
    // second outbox event. Other unique-constraint failures still propagate.
    if (!idempotencyKey || !isUniqueConstraintError(error)) throw error;

    const existing = await db.automationExecution.findUnique({
      where: {
        organizationId_idempotencyKey: {
          organizationId: input.organizationId,
          idempotencyKey,
        },
      },
      select: { id: true, definitionKey: true, definitionVersion: true },
    });

    if (!existing) throw error;
    if (existing.definitionKey !== input.task.key ||
        existing.definitionVersion !== input.task.version) {
      throw new Error("AUTOMATION_IDEMPOTENCY_CONFLICT");
    }

    return { id: existing.id };
  }
}

export async function getTaskExecutionRecord(id: string, organizationId: string) {
  return getDb().automationExecution.findFirst({
    where: { id, organizationId },
    include: { steps: { orderBy: { createdAt: "asc" } } },
  });
}
