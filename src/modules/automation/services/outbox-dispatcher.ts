import "server-only";
import { automationTrace } from "@/shared/automation/trace";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { PgBoss } from "pg-boss";

import {
  resolveTaskRetryPolicy,
  type TaskRetryPolicy,
} from "@/shared/automation/define";
import { getDb } from "@/shared/db";
import { purgeAutomationHistory, runDueSchedules } from "./scheduler";
import { processWorkflowOutboxBatch, wakeDueWorkflowSteps } from "./workflow-runtime";
import {
  automationTaskQueuePayloadSchema,
  AUTOMATION_TASK_QUEUE,
} from "../worker/queue";
import {
  recoverExpiredAutomationExecutions,
  recoverUndeliveredPendingExecutions,
} from "./lease-recovery";

const OUTBOX_BATCH_SIZE = 25;
const OUTBOX_MAX_ATTEMPTS = 10;
const OUTBOX_CLAIM_DURATION_MS = 5 * 60 * 1000;
const DISPATCHER_ID = randomUUID();

type ClaimedOutboxEvent = {
  id: string;
  eventKey: string;
  eventType: string;
  executionId: string | null;
  payload: Prisma.JsonValue;
  attempts: number;
};

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
 * Atomically claim a batch using PostgreSQL row locks and SKIP LOCKED.
 * Expired PROCESSING claims are recoverable after a dispatcher crash.
 */
async function claimOutboxBatch(): Promise<ClaimedOutboxEvent[]> {
  const now = new Date();
  const claimExpiresAt = new Date(now.getTime() + OUTBOX_CLAIM_DURATION_MS);

  return getDb().$queryRaw<ClaimedOutboxEvent[]>(Prisma.sql`
    WITH candidates AS (
      SELECT "id"
      FROM "automation_outbox"
      WHERE "eventType" = 'automation.task.requested'
        AND "availableAt" <= ${now}
        AND (
          "status" = 'PENDING'
          OR (
            "status" = 'PROCESSING'
            AND "claimExpiresAt" IS NOT NULL
            AND "claimExpiresAt" < ${now}
          )
        )
      ORDER BY "availableAt" ASC, "createdAt" ASC
      LIMIT ${OUTBOX_BATCH_SIZE}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "automation_outbox" AS outbox
    SET
      "status" = 'PROCESSING',
      "claimOwner" = ${DISPATCHER_ID},
      "claimExpiresAt" = ${claimExpiresAt},
      "attempts" = outbox."attempts" + 1,
      "updatedAt" = ${now}
    FROM candidates
    WHERE outbox."id" = candidates."id"
    RETURNING
      outbox."id",
      outbox."eventKey",
      outbox."eventType",
      outbox."executionId",
      outbox."payload",
      outbox."attempts"
  `);
}

async function releaseClaim(
  eventId: string,
  data: {
    status: "PENDING" | "FAILED" | "PUBLISHED";
    availableAt?: Date;
    publishedAt?: Date;
    lastErrorCode: string | null;
  },
): Promise<boolean> {
  const result = await getDb().automationOutbox.updateMany({
    where: {
      id: eventId,
      status: "PROCESSING",
      claimOwner: DISPATCHER_ID,
    },
    data: {
      status: data.status,
      ...(data.availableAt ? { availableAt: data.availableAt } : {}),
      ...(data.publishedAt ? { publishedAt: data.publishedAt } : {}),
      lastErrorCode: data.lastErrorCode,
      claimOwner: null,
      claimExpiresAt: null,
    },
  });
  return result.count === 1;
}

async function failClaim(event: ClaimedOutboxEvent, code: string): Promise<void> {
  await releaseClaim(event.id, {
    status: "FAILED",
    lastErrorCode: code,
  });
}

/**
 * Publish pending ERP outbox rows to pg-boss.
 *
 * The database claim prevents concurrent dispatchers from working the same row.
 * The stable pg-boss singleton key still protects the crash window after send
 * succeeds but before the outbox row is marked PUBLISHED.
 */
/**
 * Map the persisted retry policy onto pg-boss options. maxAttempts includes the
 * first run; pg-boss retryLimit counts retries. pg-boss rejects retryDelayMax
 * unless exponential backoff is enabled, so constant-delay tasks omit it.
 */
export function queueRetryOptions(policy: TaskRetryPolicy) {
  return {
    retryLimit: Math.max(0, policy.maxAttempts - 1),
    retryDelay: policy.initialDelaySeconds,
    ...(policy.backoffMultiplier === 2
      ? { retryBackoff: true, retryDelayMax: policy.maxDelaySeconds }
      : { retryBackoff: false }),
  };
}

export async function dispatchAutomationOutboxBatch(boss: PgBoss): Promise<number> {
  const db = getDb();
  const events = await claimOutboxBatch();
  let published = 0;

  for (const event of events) {
    try {
      if (event.attempts > OUTBOX_MAX_ATTEMPTS) {
        await failClaim(event, "OUTBOX_ATTEMPTS_EXHAUSTED");
        continue;
      }

      const parsed = automationTaskQueuePayloadSchema.safeParse(event.payload);
      if (!parsed.success || !event.executionId || parsed.data.executionId !== event.executionId) {
        await failClaim(event, "OUTBOX_PAYLOAD_INVALID");
        continue;
      }

      const execution = await db.automationExecution.findUnique({
        where: { id: parsed.data.executionId },
        select: { retryPolicy: true, scheduledAt: true, status: true },
      });

      if (!execution || ["FAILED", "SUCCEEDED", "CANCELLED"].includes(execution.status)) {
        await failClaim(event, "EXECUTION_NOT_DISPATCHABLE");
        continue;
      }

      if (execution.scheduledAt && execution.scheduledAt > new Date()) {
        await releaseClaim(event.id, {
          status: "PENDING",
          availableAt: execution.scheduledAt,
          lastErrorCode: null,
        });
        continue;
      }

      const retryPolicy = resolveTaskRetryPolicy(
        asObject(execution.retryPolicy) as Partial<TaskRetryPolicy>,
      );

      await boss.send(AUTOMATION_TASK_QUEUE, parsed.data, {
        singletonKey: `automation.execution:${parsed.data.executionId}`,
        // Short dedupe window: active jobs are checked by the pending watchdog;
        // a terminally failed transport delivery must become enqueueable again.
        singletonSeconds: 60,
        ...queueRetryOptions(retryPolicy),
        expireInSeconds: 60 * 60,
        deleteAfterSeconds: 60 * 60 * 24 * 7,
      });

      const didPublish = await releaseClaim(event.id, {
        status: "PUBLISHED",
        publishedAt: new Date(),
        lastErrorCode: null,
      });
      if (didPublish) {
        published += 1;
        automationTrace("dispatch", "task sent to queue", { task: parsed.data.taskKey, execution: parsed.data.executionId });
      }
    } catch (error) {
      const code = errorCode(error);
      const attempts = event.attempts;
      await releaseClaim(event.id, {
        status: attempts >= OUTBOX_MAX_ATTEMPTS ? "FAILED" : "PENDING",
        availableAt: new Date(Date.now() + retryDelaySeconds(attempts) * 1000),
        lastErrorCode: code,
      });
    }
  }

  return published;
}

export async function runAutomationOutboxDispatcher(
  boss: PgBoss,
  signal: AbortSignal,
): Promise<void> {
  let nextLeaseRecoveryAt = 0;
  let nextScheduleAt = 0;
  let nextWakeAt = 0;
  let nextPurgeAt = Date.now() + 60_000;

  while (!signal.aborted) {
    try {
      if (Date.now() >= nextLeaseRecoveryAt) {
        await recoverExpiredAutomationExecutions();
        await recoverUndeliveredPendingExecutions();
        nextLeaseRecoveryAt = Date.now() + 15_000;
      }

      if (Date.now() >= nextScheduleAt) {
        await runDueSchedules();
        nextScheduleAt = Date.now() + 30_000;
      }

      if (Date.now() >= nextPurgeAt) {
        await purgeAutomationHistory();
        nextPurgeAt = Date.now() + 60 * 60_000;
      }

      const published = await dispatchAutomationOutboxBatch(boss);
      const workflowEvents = await processWorkflowOutboxBatch();
      if (Date.now() >= nextWakeAt) {
        await wakeDueWorkflowSteps();
        nextWakeAt = Date.now() + 15_000;
      }
      if (published === 0 && workflowEvents === 0) await wait(1_000, signal);
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
