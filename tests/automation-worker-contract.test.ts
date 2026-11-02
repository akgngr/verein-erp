import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { automationTaskQueuePayloadSchema } from "../src/modules/automation/worker/queue";

describe("Automation worker queue contract", () => {
  test("accepts only the minimal execution envelope", () => {
    const parsed = automationTaskQueuePayloadSchema.parse({
      executionId: "execution-1",
      taskKey: "mailings.send_campaign",
      taskVersion: 1,
    });

    assert.deepEqual(parsed, {
      executionId: "execution-1",
      taskKey: "mailings.send_campaign",
      taskVersion: 1,
    });
  });

  test("rejects PII or arbitrary properties in queue payloads", () => {
    const parsed = automationTaskQueuePayloadSchema.safeParse({
      executionId: "execution-1",
      taskKey: "mailings.send_campaign",
      taskVersion: 1,
      recipientEmails: ["person@example.org"],
    });

    assert.equal(parsed.success, false);
  });

  test("rejects invalid task versions and missing identifiers", () => {
    assert.equal(automationTaskQueuePayloadSchema.safeParse({
      executionId: "execution-1",
      taskKey: "mailings.send_campaign",
      taskVersion: 0,
    }).success, false);

    assert.equal(automationTaskQueuePayloadSchema.safeParse({
      taskKey: "mailings.send_campaign",
      taskVersion: 1,
    }).success, false);
  });
});
