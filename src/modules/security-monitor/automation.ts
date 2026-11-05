import "server-only";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { defineTask } from "@/shared/automation/define";

/**
 * Security test runs can take several minutes. Keep execution outside the
 * Next.js request process and pass only a generated request ID plus suite key.
 */
export const runSecurityTestsTask = defineTask({
  key: "security-monitor.run_tests",
  version: 1,
  description: "security-monitor.run_tests",
  inputSchema: z.object({
    requestId: z.string().uuid(),
    testSuite: z.enum(["security"]),
  }).strict(),
  timeoutSeconds: 360,
  retry: {
    maxAttempts: 1,
    initialDelaySeconds: 0,
    maxDelaySeconds: 0,
    backoffMultiplier: 1,
  },
  workflow: { defaultInput: { requestId: "{{uuid}}", testSuite: "security" } },
  // Administrators may run the suite on a recurring schedule (e.g. nightly).
  schedule: {
    input: () => ({ requestId: randomUUID(), testSuite: "security" as const }),
    minIntervalMinutes: 60,
  },
  idempotencyKey: (input) => `security-monitor:run:${input.requestId}`,
  handler: async (input, context) => {
    const { runSecurityTests } = await import("./services/test-runner");
    const result = await runSecurityTests({
      testSuite: input.testSuite,
      triggeredBy: context.requestedById ?? "automation",
    });

    // Keep large test logs and detailed results in SecurityTestRun, not in
    // the Automation execution payload.
    return {
      success: result.success,
      testSuite: result.testSuite,
      totalTests: result.totalTests,
      passed: result.passed,
      failed: result.failed,
      skipped: result.skipped,
      durationMs: result.durationMs,
    };
  },
});
