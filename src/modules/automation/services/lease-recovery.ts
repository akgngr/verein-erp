import "server-only";

import { Prisma } from "@prisma/client";

import {
  resolveTaskRetryPolicy,
  type TaskRetryPolicy,
} from "@/shared/automation/define";
import {
  getLegacyExecutionStaleBefore,
  getPendingExecutionRecoveryBefore,
  getPendingRecoveryEventKey,
  isExecutionAttemptExhausted,
} from "@/shared/automation/lease";
import { getDb } from "@/shared/db";
import { AUTOMATION_TASK_QUEUE } from "../worker/queue";
import { recordAutomationLog } from "./log-store";

const RECOVERY_BATCH_SIZE = 100;

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/**
 * Recover executions whose worker lease expired.
 *
 * The fencing-token + lease-expiry predicate makes this safe to run from
 * multiple worker processes: only one recovery transaction can move a given
 * execution back to PENDING or FAILED.
 */
export async function recoverExpiredAutomationExecutions(): Promise<number> {
  const db = getDb();
  const now = new Date();
  const legacyStaleBefore = getLegacyExecutionStaleBefore(now);
  const expired = await db.automationExecution.findMany({
    where: {
      status: "RUNNING",
      OR: [
        { leaseExpiresAt: { lt: now } },
        {
          leaseExpiresAt: null,
          OR: [
            { startedAt: null },
            { startedAt: { lt: legacyStaleBefore } },
          ],
        },
      ],
    },
    orderBy: { leaseExpiresAt: "asc" },
    take: RECOVERY_BATCH_SIZE,
    select: {
      id: true,
      definitionKey: true,
      definitionVersion: true,
      attempt: true,
      retryPolicy: true,
      leaseToken: true,
      startedAt: true,
    },
  });

  let recovered = 0;

  for (const execution of expired) {
    let retryPolicy: TaskRetryPolicy;
    let policyInvalid = false;
    try {
      retryPolicy = resolveTaskRetryPolicy(
        asObject(execution.retryPolicy) as Partial<TaskRetryPolicy>,
      );
    } catch {
      policyInvalid = true;
      retryPolicy = {
        maxAttempts: execution.attempt,
        initialDelaySeconds: 0,
        maxDelaySeconds: 0,
        backoffMultiplier: 1,
      };
    }

    const exhausted = policyInvalid ||
      isExecutionAttemptExhausted(execution.attempt, retryPolicy.maxAttempts);
    const errorCode = policyInvalid ? "TASK_RETRY_POLICY_INVALID" : "TASK_LEASE_EXPIRED";

    const result = await db.$transaction(async (tx) => {
      const update = await tx.automationExecution.updateMany({
        where: {
          id: execution.id,
          status: "RUNNING",
          leaseToken: execution.leaseToken,
          OR: [
            { leaseExpiresAt: { lt: now } },
            {
              leaseExpiresAt: null,
              OR: [
                { startedAt: null },
                { startedAt: { lt: legacyStaleBefore } },
              ],
            },
          ],
        },
        data: {
          status: exhausted ? "FAILED" : "PENDING",
          startedAt: null,
          heartbeatAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          ...(exhausted ? { finishedAt: now } : {}),
          lastErrorCode: errorCode,
        },
      });

      if (update.count === 0) return null;

      await tx.automationStepRun.updateMany({
        where: {
          executionId: execution.id,
          stepKey: "main",
          status: "RUNNING",
        },
        data: {
          status: exhausted ? "FAILED" : "RETRYING",
          startedAt: null,
          ...(exhausted ? { finishedAt: now } : {}),
          lastErrorCode: errorCode,
        },
      });

      if (!exhausted) {
        await tx.automationOutbox.create({
          data: {
            eventKey: `automation.task.recovery:${execution.id}:${execution.leaseToken}`,
            eventType: "automation.task.requested",
            executionId: execution.id,
            availableAt: now,
            payload: {
              executionId: execution.id,
              taskKey: execution.definitionKey,
              taskVersion: execution.definitionVersion,
            },
          },
        });
      }

      return exhausted ? "FAILED" as const : "REQUEUED" as const;
    });

    if (!result) continue;
    recovered += 1;

    await recordAutomationLog({
      executionId: execution.id,
      level: result === "FAILED" ? "ERROR" : "WARN",
      event: result === "FAILED" ? "LEASE_EXPIRED_FINAL" : "LEASE_EXPIRED_RECOVERED",
      message: result === "FAILED"
        ? "Worker lease expired after the final allowed attempt."
        : "Expired worker lease recovered and execution requeued.",
      details: {
        attempt: execution.attempt,
        maxAttempts: retryPolicy.maxAttempts,
        leaseToken: execution.leaseToken,
        recovery: result,
      },
    });
  }

  return recovered;
}


/**
 * Recover PENDING executions whose pg-boss delivery has no live job.
 *
 * A PENDING execution is normally waiting for a queued/retrying pg-boss job.
 * If transport retries are exhausted before the handler can claim it, that
 * job becomes terminal while the ERP execution remains PENDING. We detect
 * this by checking pg-boss's live states, then create a minute-bucketed
 * outbox event. The event key prevents concurrent dispatchers from creating
 * duplicates in the same recovery window.
 */
export async function recoverUndeliveredPendingExecutions(): Promise<number> {
  const db = getDb();
  const now = new Date();
  const staleBefore = getPendingExecutionRecoveryBefore(now);
  const candidates = await db.automationExecution.findMany({
    where: {
      status: "PENDING",
      updatedAt: { lt: staleBefore },
      OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
    },
    orderBy: { updatedAt: "asc" },
    take: RECOVERY_BATCH_SIZE,
    select: {
      id: true,
      definitionKey: true,
      definitionVersion: true,
      attempt: true,
      updatedAt: true,
    },
  });

  if (candidates.length === 0) return 0;

  const executionIds = candidates.map((item) => item.id);
  const liveJobs = await db.$queryRaw<Array<{ executionId: string }>>(Prisma.sql`
    SELECT DISTINCT job.data ->> 'executionId' AS "executionId"
    FROM "pgboss"."job" AS job
    WHERE job.name = ${AUTOMATION_TASK_QUEUE}
      AND job.state IN ('created', 'retry', 'active')
      AND job.data ->> 'executionId' IN (${Prisma.join(executionIds)})
  `);
  const liveExecutionIds = new Set(liveJobs.map((job) => job.executionId));

  let requeued = 0;

  for (const execution of candidates) {
    if (liveExecutionIds.has(execution.id)) continue;

    const eventKey = getPendingRecoveryEventKey(execution.id, execution.attempt, now);
    try {
      const created = await db.$transaction(async (tx) => {
        const current = await tx.automationExecution.findFirst({
          where: {
            id: execution.id,
            status: "PENDING",
            updatedAt: execution.updatedAt,
            OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
          },
          select: { id: true },
        });
        if (!current) return false;

        await tx.automationOutbox.create({
          data: {
            eventKey,
            eventType: "automation.task.requested",
            executionId: execution.id,
            availableAt: now,
            payload: {
              executionId: execution.id,
              taskKey: execution.definitionKey,
              taskVersion: execution.definitionVersion,
            },
          },
        });
        return true;
      });

      if (!created) continue;
      requeued += 1;
      await recordAutomationLog({
        executionId: execution.id,
        level: "WARN",
        event: "PENDING_DELIVERY_RECOVERED",
        message: "No live queue delivery was found for a stale pending execution; a recovery outbox event was created.",
        details: {
          attempt: execution.attempt,
          eventKey,
          staleSince: execution.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      // Another dispatcher may have created the same minute-bucketed event.
      // Unique conflicts are expected coordination, not a failed execution.
      if (!(error && typeof error === "object" && "code" in error && error.code === "P2002")) {
        throw error;
      }
    }
  }

  return requeued;
}
