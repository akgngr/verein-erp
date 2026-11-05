import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import { defineTask, resolveTaskRetryPolicy } from "../../src/shared/automation/define";
import {
  EXECUTION_HEARTBEAT_INTERVAL_MS,
  EXECUTION_LEASE_DURATION_MS,
  LEGACY_EXECUTION_STALE_AFTER_MS,
  PENDING_EXECUTION_RECOVERY_AFTER_MS,
  PENDING_EXECUTION_RECOVERY_INTERVAL_MS,
  getExecutionLeaseExpiry,
  getLegacyExecutionStaleBefore,
  getPendingExecutionRecoveryBefore,
  getPendingRecoveryEventKey,
  isExecutionAttemptExhausted,
} from "../../src/shared/automation/lease";
import { defineTaskRegistry } from "../../src/modules/automation/tasks/registry";

describe("Automation worker lease policy", () => {
  test("heartbeat interval stays safely below the lease duration", () => {
    assert.ok(EXECUTION_HEARTBEAT_INTERVAL_MS < EXECUTION_LEASE_DURATION_MS);
    assert.equal(EXECUTION_LEASE_DURATION_MS, 45_000);
    assert.equal(EXECUTION_HEARTBEAT_INTERVAL_MS, 10_000);
  });

  test("computes lease expiry from the current timestamp", () => {
    const now = new Date("2026-11-05T12:00:00.000Z");
    assert.equal(
      getExecutionLeaseExpiry(now).toISOString(),
      "2026-11-05T12:00:45.000Z",
    );
  });

  test("preserves the two-hour recovery window for legacy RUNNING rows", () => {
    const now = new Date("2026-11-05T12:00:00.000Z");
    assert.equal(LEGACY_EXECUTION_STALE_AFTER_MS, 2 * 60 * 60 * 1000);
    assert.equal(
      getLegacyExecutionStaleBefore(now).toISOString(),
      "2026-11-05T10:00:00.000Z",
    );
  });

  test("recovers stale pending executions only after the transport grace period", () => {
    const now = new Date("2026-11-05T12:00:00.000Z");
    assert.equal(PENDING_EXECUTION_RECOVERY_AFTER_MS, 2 * 60 * 1000);
    assert.equal(
      getPendingExecutionRecoveryBefore(now).toISOString(),
      "2026-11-05T11:58:00.000Z",
    );
  });

  test("uses one idempotent pending-recovery event key per minute and attempt", () => {
    const first = new Date("2026-11-05T12:00:10.000Z");
    const sameBucket = new Date("2026-11-05T12:00:55.000Z");
    const nextBucket = new Date(first.getTime() + PENDING_EXECUTION_RECOVERY_INTERVAL_MS);

    assert.equal(
      getPendingRecoveryEventKey("execution-1", 2, first),
      "automation.task.pending-recovery:execution-1:2:29855040",
    );
    assert.equal(
      getPendingRecoveryEventKey("execution-1", 2, first),
      getPendingRecoveryEventKey("execution-1", 2, sameBucket),
    );
    assert.notEqual(
      getPendingRecoveryEventKey("execution-1", 2, first),
      getPendingRecoveryEventKey("execution-1", 2, nextBucket),
    );
    assert.notEqual(
      getPendingRecoveryEventKey("execution-1", 2, first),
      getPendingRecoveryEventKey("execution-1", 3, first),
    );
  });

  test("recovery stops when the persisted attempt budget is exhausted", () => {
    assert.equal(isExecutionAttemptExhausted(1, 3), false);
    assert.equal(isExecutionAttemptExhausted(2, 3), false);
    assert.equal(isExecutionAttemptExhausted(3, 3), true);
    assert.equal(isExecutionAttemptExhausted(4, 3), true);
  });
});

describe("Automation task contracts", () => {
  test("defines a versioned task with schema-validated input", () => {
    const task = defineTask({
      key: "mailings.send_campaign",
      version: 1,
      description: "Send a mailing campaign",
      inputSchema: z.object({ campaignId: z.string().min(1) }),
      handler: async (input) => ({ campaignId: input.campaignId }),
    });

    assert.equal(task.key, "mailings.send_campaign");
    assert.equal(task.version, 1);
    assert.equal(task.inputSchema.parse({ campaignId: "campaign-1" }).campaignId, "campaign-1");
    assert.throws(() => task.inputSchema.parse({ campaignId: "" }));
  });

  test("normalizes retry policy and keeps queue settings within the supported contract", () => {
    const task = defineTask({
      key: "mailings.send_campaign",
      version: 1,
      description: "Send a mailing campaign",
      inputSchema: z.object({ campaignId: z.string().min(1) }),
      retry: {
        maxAttempts: 4,
        initialDelaySeconds: 5,
        maxDelaySeconds: 60,
        backoffMultiplier: 1,
      },
      handler: async () => undefined,
    });

    assert.deepEqual(task.retry, {
      maxAttempts: 4,
      initialDelaySeconds: 5,
      maxDelaySeconds: 60,
      backoffMultiplier: 1,
    });
    assert.deepEqual(resolveTaskRetryPolicy(), {
      maxAttempts: 3,
      initialDelaySeconds: 30,
      maxDelaySeconds: 1800,
      backoffMultiplier: 2,
    });
  });

  test("keeps idempotency key generation inside the task definition", () => {
    const task = defineTask({
      key: "mailings.send_campaign",
      version: 1,
      description: "Send a mailing campaign",
      inputSchema: z.object({ campaignId: z.string().min(1) }),
      idempotencyKey: (input) => `mailings:campaign:${input.campaignId}`,
      handler: async () => undefined,
    });

    assert.equal(
      task.idempotencyKey?.({ campaignId: "campaign-42" }),
      "mailings:campaign:campaign-42",
    );
  });

  test("rejects retry policies that cannot be represented by the queue transport", () => {
    assert.throws(() => resolveTaskRetryPolicy({ maxAttempts: 0 }));
    assert.throws(() => resolveTaskRetryPolicy({ initialDelaySeconds: -1 }));
    assert.throws(() => resolveTaskRetryPolicy({ maxDelaySeconds: 10, initialDelaySeconds: 20 }));
    assert.throws(() => resolveTaskRetryPolicy({ backoffMultiplier: 3 as unknown as 1 | 2 }));
  });

  test("rejects unnamespaced task keys", () => {
    assert.throws(() =>
      defineTask({
        key: "sendCampaign" as `${string}.${string}`,
        version: 1,
        description: "Invalid key",
        inputSchema: z.object({}),
        handler: async () => undefined,
      }),
    );
  });

  test("rejects invalid task versions and timeouts", () => {
    const base = {
      key: "mailings.send_campaign" as const,
      description: "Send a mailing campaign",
      inputSchema: z.object({}),
      handler: async () => undefined,
    };

    assert.throws(() => defineTask({ ...base, version: 0 }));
    assert.throws(() => defineTask({ ...base, version: 1, timeoutSeconds: 0 }));
  });

  test("rejects duplicate task keys in the static registry", () => {
    assert.throws(() =>
      defineTaskRegistry([{ key: "mailings.send_campaign" }, { key: "mailings.send_campaign" }]),
    );
  });
});
