import "server-only";

import {
  resolveTaskRetryPolicy,
  type TaskRetryPolicy,
} from "@/shared/automation/define";
import { isExecutionAttemptExhausted } from "@/shared/automation/lease";
import { getDb } from "@/shared/db";
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
  const expired = await db.automationExecution.findMany({
    where: {
      status: "RUNNING",
      leaseExpiresAt: { lt: now },
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
          leaseExpiresAt: { lt: now },
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
