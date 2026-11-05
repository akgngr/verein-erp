import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { runSecurityTestsTask } from "@/modules/security-monitor/automation";

describe("Security Monitor automation task", () => {
  test("accepts only the supported suite and a generated request ID", () => {
    const input = {
      requestId: "9f1c3a42-8c6a-4eab-9f53-3e0a6e2d8c11",
      testSuite: "security",
    };

    assert.deepEqual(runSecurityTestsTask.inputSchema.parse(input), input);
    assert.equal(
      runSecurityTestsTask.inputSchema.safeParse({
        ...input,
        unexpected: "value",
      }).success,
      false,
    );
    assert.equal(
      runSecurityTestsTask.inputSchema.safeParse({
        ...input,
        testSuite: "all",
      }).success,
      false,
    );
  });

  test("uses a stable, request-scoped idempotency key", () => {
    const input = {
      requestId: "9f1c3a42-8c6a-4eab-9f53-3e0a6e2d8c11",
      testSuite: "security" as const,
    };

    assert.equal(
      runSecurityTestsTask.idempotencyKey?.(input),
      "security-monitor:run:9f1c3a42-8c6a-4eab-9f53-3e0a6e2d8c11",
    );
  });

  test("declares a worker timeout and a single attempt to avoid duplicate test runs", () => {
    assert.equal(runSecurityTestsTask.timeoutSeconds, 360);
    assert.deepEqual(runSecurityTestsTask.retry, {
      maxAttempts: 1,
      initialDelaySeconds: 0,
      maxDelaySeconds: 0,
      backoffMultiplier: 1,
    });
  });
});
