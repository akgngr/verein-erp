import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import {
  resolveTaskRetryPolicy,
  type TaskDefinition,
  type TaskExecutionContext,
  type TaskRetryPolicy,
} from "@/shared/automation/define";
import { getDb } from "@/shared/db";
import {
  EXECUTION_HEARTBEAT_INTERVAL_MS,
  EXECUTION_LEASE_DURATION_MS,
  getExecutionLeaseExpiry,
} from "@/shared/automation/lease";
import { automationTasks } from "../tasks/registry";
import { recordAutomationLog } from "./log-store";
import type { AutomationTaskQueuePayload } from "../worker/queue";

const WORKER_ID = randomUUID();
const registeredTasks = automationTasks as unknown as readonly TaskDefinition[];

function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string") {
    return error.code.slice(0, 80);
  }
  if (error instanceof Error && error.message === "TASK_TIMEOUT") return "TASK_TIMEOUT";
  if (error instanceof Error && error.message === "TASK_LEASE_LOST") return "TASK_LEASE_LOST";
  return error instanceof Error ? error.name.slice(0, 80) : "TASK_FAILED";
}

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

async function markTerminal(
  executionId: string,
  leaseToken: number,
  status: "FAILED" | "SUCCEEDED",
  code: string | null,
  result?: unknown,
): Promise<boolean> {
  const db = getDb();
  const storedResult = result == null
    ? Prisma.JsonNull
    : JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue;

  const committed = await db.$transaction(async (tx) => {
    const update = await tx.automationExecution.updateMany({
      where: {
        id: executionId,
        status: "RUNNING",
        leaseOwner: WORKER_ID,
        leaseToken,
      },
      data: {
        status,
        finishedAt: new Date(),
        lastErrorCode: code,
        leaseOwner: null,
        leaseExpiresAt: null,
        heartbeatAt: null,
      },
    });

    if (update.count === 0) return false;

    await tx.automationStepRun.updateMany({
      where: { executionId, stepKey: "main", status: "RUNNING" },
      data: {
        status,
        finishedAt: new Date(),
        lastErrorCode: code,
        ...(status === "SUCCEEDED" ? { result: storedResult } : {}),
      },
    });
    return true;
  });

  if (!committed) return false;

  await recordAutomationLog({
    executionId,
    level: status === "FAILED" ? "ERROR" : "INFO",
    event: status === "FAILED" ? "EXECUTION_FAILED" : "EXECUTION_SUCCEEDED",
    message: status === "FAILED" ? `Task failed: ${code ?? "TASK_FAILED"}` : "Task completed successfully.",
    details: { status, errorCode: code, leaseToken },
  });
  return true;
}

async function renewLease(executionId: string, leaseToken: number): Promise<boolean> {
  const now = new Date();
  const result = await getDb().automationExecution.updateMany({
    where: {
      id: executionId,
      status: "RUNNING",
      leaseOwner: WORKER_ID,
      leaseToken,
    },
    data: {
      heartbeatAt: now,
      leaseExpiresAt: getExecutionLeaseExpiry(now),
    },
  });
  return result.count === 1;
}

/**
 * Claim and execute one trusted task.
 *
 * Each claim increments a fencing token. Heartbeats extend the lease while the
 * handler is active; stale workers cannot finalize or retry after a newer worker
 * has acquired the execution. Handlers must honor context.signal and make
 * external side effects idempotent because a process can lose its lease mid-call.
 */
export async function executeAutomationTask(payload: AutomationTaskQueuePayload): Promise<void> {
  const db = getDb();
  const existing = await db.automationExecution.findUnique({
    where: { id: payload.executionId },
    include: { steps: true },
  });

  if (!existing || ["SUCCEEDED", "FAILED", "CANCELLED"].includes(existing.status)) return;
  if (existing.definitionKey !== payload.taskKey || existing.definitionVersion !== payload.taskVersion) {
    await db.$transaction(async (tx) => {
      const failed = await tx.automationExecution.updateMany({
        where: { id: payload.executionId, status: "PENDING" },
        data: { status: "FAILED", finishedAt: new Date(), lastErrorCode: "TASK_ENVELOPE_MISMATCH" },
      });
      if (failed.count === 0) return;

      await tx.automationStepRun.updateMany({
        where: { executionId: payload.executionId, stepKey: "main", status: { in: ["PENDING", "RETRYING"] } },
        data: { status: "FAILED", finishedAt: new Date(), lastErrorCode: "TASK_ENVELOPE_MISMATCH" },
      });
    });
    return;
  }

  const now = new Date();
  const claimed = await db.$transaction(async (tx) => {
    const update = await tx.automationExecution.updateMany({
      where: {
        id: payload.executionId,
        OR: [
          { status: "PENDING" },
          // Null leases are legacy RUNNING rows from before this migration.
          { status: "RUNNING", leaseExpiresAt: null },
          { status: "RUNNING", leaseExpiresAt: { lt: now } },
        ],
      },
      data: {
        status: "RUNNING",
        attempt: { increment: 1 },
        startedAt: now,
        heartbeatAt: now,
        leaseOwner: WORKER_ID,
        leaseExpiresAt: getExecutionLeaseExpiry(now),
        leaseToken: { increment: 1 },
        finishedAt: null,
        lastErrorCode: null,
      },
    });

    if (update.count === 0) return null;

    const execution = await tx.automationExecution.findUnique({
      where: { id: payload.executionId },
      select: { leaseToken: true },
    });
    if (!execution) throw new Error("TASK_CLAIM_RECORD_MISSING");

    await tx.automationStepRun.updateMany({
      where: { executionId: payload.executionId, stepKey: "main" },
      data: {
        status: "RUNNING",
        attempt: { increment: 1 },
        startedAt: now,
        finishedAt: null,
        lastErrorCode: null,
      },
    });
    return { leaseToken: execution.leaseToken };
  });

  if (!claimed) return;

  const leaseToken = claimed.leaseToken;
  const execution = existing;
  const retryPolicy = resolveTaskRetryPolicy(
    asObject(execution.retryPolicy) as Partial<TaskRetryPolicy>,
  );
  const attempt = execution.attempt + 1;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let heartbeatBusy = false;
  let lastConfirmedHeartbeatAt = Date.now();
  let leaseLost = false;
  let rejectLeaseLost!: (error: Error) => void;

  const leaseLostPromise = new Promise<never>((_, reject) => {
    rejectLeaseLost = reject;
  });

  const loseLease = () => {
    if (leaseLost) return;
    leaseLost = true;
    rejectLeaseLost(new Error("TASK_LEASE_LOST"));
  };

  // Everything after claiming stays inside the error boundary. The worker runs
  // outside a Next.js request and must not depend on request-scoped services.
  try {
    await recordAutomationLog({
      executionId: execution.id,
      event: "ATTEMPT_STARTED",
      message: payload.taskKey,
      details: { attempt, maxAttempts: retryPolicy.maxAttempts, taskKey: execution.definitionKey, leaseToken },
    });

    if (attempt > retryPolicy.maxAttempts) {
      if (!await markTerminal(payload.executionId, leaseToken, "FAILED", "TASK_ATTEMPTS_EXHAUSTED")) {
        throw new Error("TASK_LEASE_LOST");
      }
      return;
    }

    const task = registeredTasks.find((item) => item.key === payload.taskKey);
    if (!task) {
      if (!await markTerminal(payload.executionId, leaseToken, "FAILED", "TASK_NOT_REGISTERED")) {
        throw new Error("TASK_LEASE_LOST");
      }
      return;
    }
    if (task.version !== payload.taskVersion) {
      if (!await markTerminal(payload.executionId, leaseToken, "FAILED", "TASK_VERSION_NOT_REGISTERED")) {
        throw new Error("TASK_LEASE_LOST");
      }
      return;
    }

    const parsedInput = task.inputSchema.safeParse(execution.input);
    if (!parsedInput.success) {
      if (!await markTerminal(payload.executionId, leaseToken, "FAILED", "TASK_INPUT_INVALID")) {
        throw new Error("TASK_LEASE_LOST");
      }
      return;
    }

    const storedContext = asObject(execution.context);
    const controller = new AbortController();
    const timeoutSeconds = task.timeoutSeconds ?? 300;

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

    const heartbeatOnce = async () => {
      if (heartbeatBusy || leaseLost) return;
      heartbeatBusy = true;
      try {
        if (!await renewLease(execution.id, leaseToken)) {
          controller.abort();
          loseLease();
        } else {
          lastConfirmedHeartbeatAt = Date.now();
        }
      } catch (error) {
        // A transient database error is retried on the next heartbeat. Stop only
        // after the last confirmed lease could have expired.
        if (Date.now() - lastConfirmedHeartbeatAt >= EXECUTION_LEASE_DURATION_MS) {
          controller.abort();
          loseLease();
        } else {
          console.warn("[automation:worker] Lease heartbeat geçici hata:", errorCode(error));
        }
      } finally {
        heartbeatBusy = false;
      }
    };

    heartbeat = setInterval(() => { void heartbeatOnce(); }, EXECUTION_HEARTBEAT_INTERVAL_MS);
    void heartbeatOnce();

    const handler = Promise.resolve().then(() => task.handler(parsedInput.data, context));
    const timedOut = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error("TASK_TIMEOUT"));
      }, timeoutSeconds * 1000);
    });

    const result = await Promise.race([handler, timedOut, leaseLostPromise]);
    if (!await markTerminal(payload.executionId, leaseToken, "SUCCEEDED", null, result)) {
      throw new Error("TASK_LEASE_LOST");
    }
  } catch (error) {
    const code = errorCode(error);
    if (leaseLost || code === "TASK_LEASE_LOST") {
      // A newer worker owns the execution. Do not mutate its state; let pg-boss
      // redeliver according to its retry policy if this queue attempt is still live.
      throw new Error("TASK_LEASE_LOST");
    }

    await recordAutomationLog({
      executionId: payload.executionId,
      level: "ERROR",
      event: attempt >= retryPolicy.maxAttempts ? "ATTEMPT_FAILED_FINAL" : "ATTEMPT_FAILED_RETRYING",
      message: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
      details: { errorCode: code, attempt, maxAttempts: retryPolicy.maxAttempts, leaseToken },
    });

    if (attempt >= retryPolicy.maxAttempts) {
      if (!await markTerminal(payload.executionId, leaseToken, "FAILED", code)) {
        throw new Error("TASK_LEASE_LOST");
      }
      return;
    }

    const released = await db.$transaction(async (tx) => {
      const update = await tx.automationExecution.updateMany({
        where: {
          id: payload.executionId,
          status: "RUNNING",
          leaseOwner: WORKER_ID,
          leaseToken,
        },
        data: {
          status: "PENDING",
          startedAt: null,
          heartbeatAt: null,
          leaseOwner: null,
          leaseExpiresAt: null,
          lastErrorCode: code,
        },
      });
      if (update.count === 0) return false;

      await tx.automationStepRun.updateMany({
        where: { executionId: payload.executionId, stepKey: "main", status: "RUNNING" },
        data: { status: "RETRYING", startedAt: null, lastErrorCode: code },
      });
      return true;
    });

    if (!released) throw new Error("TASK_LEASE_LOST");
    throw new Error(code);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (heartbeat) clearInterval(heartbeat);
  }
}
