import "server-only";

import type { PgBoss } from "pg-boss";

import { getDb } from "@/shared/db";
import {
  resolveTaskRetryPolicy,
  type TaskRetryPolicy,
} from "@/shared/automation/define";
import {
  automationTaskQueuePayloadSchema,
  AUTOMATION_TASK_QUEUE,
} from "../worker/queue";

const OUTBOX_BATCH_SIZE = 25;
const OUTBOX_MAX_ATTEMPTS = 10;

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code.slice(0, 80);
  }
  return error instanceof Error ? error.name.slice(0, 80) : "OUTBOX_DISPATCH_FAILED";
}

function retryDelaySeconds(attempt: number): number {
  return Math.min(30 * 60, 5 * 2 ** Math.max(0, attempt - 1));
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/**
 * Publish pending ERP outbox rows to pg-boss.
 *
 * pg-boss is transport only. ERP execution records remain the source of truth.
 * A crash after send but before marking the outbox row published is safe: the
 * stable singleton key suppresses duplicate queue entries, and execution claims
 * are independently guarded in PostgreSQL.
 */
export async function dispatchAutomationOutboxBatch(boss: PgBoss): Promise<number> {
  const db = getDb();
  const events = await db.automationOutbox.findMany({
    where: {
      status: "PENDING",
      eventType: "automation.task.requested",
      availableAt: { lte: new Date() },
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: OUTBOX_BATCH_SIZE,
  });

  let published = 0;

  for (const event of events) {
    try {
      const parsed = automationTaskQueuePayloadSchema.safeParse(event.payload);
      if (!parsed.success || !event.executionId || parsed.data.executionId !== event.executionId) {
        await db.automationOutbox.updateMany({
          where: { id: event.id, status: "PENDING" },
          data: {
            status: "FAILED",
            attempts: { increment: 1 },
            lastErrorCode: "OUTBOX_PAYLOAD_INVALID",
          },
        });
        continue;
      }

      const execution = await db.automationExecution.findUnique({
        where: { id: parsed.data.executionId },
        select: { maxAttempts: true, retryPolicy: true, scheduledAt: true, status: true },
      });

      if (!execution || ["FAILED", "SUCCEEDED", "CANCELLED"].includes(execution.status)) {
        await db.automationOutbox.updateMany({
          where: { id: event.id, status: "PENDING" },
          data: {
            status: "FAILED",
            attempts: { increment: 1 },
            lastErrorCode: "EXECUTION_NOT_DISPATCHABLE",
          },
        });
        continue;
      }

      if (execution.scheduledAt && execution.scheduledAt > new Date()) continue;

      const retryPolicy = resolveTaskRetryPolicy(
        asObject(execution.retryPolicy) as Partial<TaskRetryPolicy>,
      );

      await boss.send(AUTOMATION_TASK_QUEUE, parsed.data, {
        singletonKey: event.eventKey,
        singletonSeconds: 60 * 60 * 24 * 30,
        // maxAttempts includes the first run; pg-boss retryLimit counts retries.
        retryLimit: Math.max(0, retryPolicy.maxAttempts - 1),
        retryDelay: retryPolicy.initialDelaySeconds,
        retryDelayMax: retryPolicy.maxDelaySeconds,
        retryBackoff: retryPolicy.backoffMultiplier === 2,
        expireInSeconds: 60 * 60,
        deleteAfterSeconds: 60 * 60 * 24 * 7,
      });

      await db.automationOutbox.updateMany({
        where: { id: event.id, status: "PENDING" },
        data: {
          status: "PUBLISHED",
          attempts: { increment: 1 },
          publishedAt: new Date(),
          lastErrorCode: null,
        },
      });
      published += 1;
    } catch (error) {
      const attempts = event.attempts + 1;
      await db.automationOutbox.updateMany({
        where: { id: event.id, status: "PENDING" },
        data: {
          attempts,
          availableAt: new Date(Date.now() + retryDelaySeconds(attempts) * 1000),
          lastErrorCode: errorCode(error),
          ...(attempts >= OUTBOX_MAX_ATTEMPTS ? { status: "FAILED" as const } : {}),
        },
      });
    }
  }

  return published;
}

export async function runAutomationOutboxDispatcher(
  boss: PgBoss,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    try {
      const published = await dispatchAutomationOutboxBatch(boss);
      if (published === 0) await wait(1_000, signal);
    } catch (error) {
      console.error("[automation:worker] Outbox dispatcher geçici hata:", errorCode(error));
      await wait(2_000, signal);
    }
  }
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(done, milliseconds);
    const onAbort = () => done();

    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      resolve();
    }

    signal.addEventListener("abort", onAbort, { once: true });
  });
}
