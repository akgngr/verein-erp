import test, { describe } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";

import { defineTask } from "../src/shared/automation/define";
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

  test("rejects unnamespaced task keys", () => {
    assert.throws(() =>
      defineTask({
        key: "sendCampaign",
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
