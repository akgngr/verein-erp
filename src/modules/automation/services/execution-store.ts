import "server-only";

import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { getDb } from "@/shared/db";
import {
  resolveTaskRetryPolicy,
  type TaskDefinition,
} from "@/shared/automation/define";
import { getAutomationRuntimeConfig } from "../runtime-config";

export type CreateTaskExecutionRecordInput<TSchema extends z.ZodType = z.ZodType> = {
  task: TaskDefinition<TSchema>;
  organizationId: string;
  requestedById?: string | null;
  sourceModule: string;
  correlationId: string;
  input: Prisma.InputJsonValue;
  context?: Prisma.InputJsonValue;
  scheduledAt?: Date;
  /** Overrides the task-defined idempotency key (e.g. one key per schedule slot). */
  idempotencyKey?: string;
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

  const idempotencyKey = input.idempotencyKey ?? input.task.idempotencyKey?.(parsedInput.data) ?? null;
  if (idempotencyKey !== null &&
      (typeof idempotencyKey !== "string" ||
        idempotencyKey.trim().length === 0 ||
        idempotencyKey.length > 255)) {
    throw new Error("TASK_IDEMPOTENCY_KEY_INVALID");
  }

  const storedInput = JSON.parse(JSON.stringify(parsedInput.data ?? {})) as Prisma.InputJsonValue;
  const db = getDb();

  try {
    return await db.$transaction((tx) => insertTaskExecution(tx, {
      task: input.task,
      organizationId: input.organizationId,
      requestedById: input.requestedById ?? null,
      sourceModule: input.sourceModule,
      correlationId: input.correlationId,
      idempotencyKey,
      input: storedInput,
      context: input.context ?? {},
      scheduledAt: input.scheduledAt,
    }));
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

/**
 * Insert execution + main step + outbox row inside an existing transaction.
 * Input must already be validated by the caller.
 */
export async function insertTaskExecution(
  tx: Prisma.TransactionClient,
  args: {
    task: TaskDefinition;
    organizationId: string;
    requestedById: string | null;
    sourceModule: string;
    correlationId: string;
    idempotencyKey: string | null;
    input: Prisma.InputJsonValue;
    context: Prisma.InputJsonValue;
    scheduledAt?: Date;
  },
) {
  const retryPolicy = resolveTaskRetryPolicy(args.task.retry);
  const execution = await tx.automationExecution.create({
    data: {
      kind: "TASK",
      status: "PENDING",
      definitionKey: args.task.key,
      definitionVersion: args.task.version,
      organizationId: args.organizationId,
      requestedById: args.requestedById,
      sourceModule: args.sourceModule,
      correlationId: args.correlationId,
      idempotencyKey: args.idempotencyKey,
      input: args.input,
      context: args.context,
      retryPolicy: retryPolicy as Prisma.InputJsonValue,
      maxAttempts: retryPolicy.maxAttempts,
      scheduledAt: args.scheduledAt,
      steps: {
        create: {
          stepKey: "main",
          taskKey: args.task.key,
          taskVersion: args.task.version,
          status: "PENDING",
          input: args.input,
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
      availableAt: args.scheduledAt ?? new Date(),
      payload: {
        executionId: execution.id,
        taskKey: args.task.key,
        taskVersion: args.task.version,
      },
    },
  });

  return execution;
}
