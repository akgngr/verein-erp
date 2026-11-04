import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import { defineTask, resolveTaskRetryPolicy } from "../src/shared/automation/define";
import { defineTaskRegistry } from "../src/modules/automation/tasks/registry";

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
