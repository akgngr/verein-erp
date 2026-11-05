import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { isTaskDefinition, taskModuleKey } from "@/shared/automation/define";
import { automationTasks, findAutomationTask } from "@/modules/automation/tasks/registry";
import { nextSlotAfter } from "@/modules/automation/services/scheduler";
import { listSchedulableTasks } from "@/modules/automation/services/schedules";

describe("Generated automation registry", () => {
  test("discovers every task exported from module automation.ts files", () => {
    const keys = automationTasks.map((task) => task.key);
    assert.ok(keys.includes("mailings.send_campaign"));
    assert.ok(keys.includes("security-monitor.run_tests"));
    assert.equal(new Set(keys).size, keys.length);
  });

  test("task keys are namespaced by their owning module directory", () => {
    for (const task of automationTasks) {
      const owner = taskModuleKey(task.key);
      assert.ok(fs.existsSync(path.join("src/modules", owner, "automation.ts")), task.key);
    }
  });

  test("non-task exports (narrow worker APIs) are ignored", () => {
    assert.equal(isTaskDefinition({ key: "x" }), false);
    assert.equal(isTaskDefinition(() => null), false);
    assert.equal(findAutomationTask("users.unknown"), undefined);
  });
});

describe("Schedules", () => {
  test("only tasks with a trusted schedule input are schedulable", () => {
    const keys = listSchedulableTasks().map((task) => task.key);
    assert.ok(keys.includes("security-monitor.run_tests"));
    assert.ok(!keys.includes("mailings.send_campaign"));
  });

  test("schedule input is produced by trusted code and passes the task schema", () => {
    const task = findAutomationTask("security-monitor.run_tests");
    assert.ok(task?.schedule);
    const input = task.schedule.input({ scheduleId: "s1", slotAt: new Date() });
    assert.ok(task.inputSchema.safeParse(input).success);
  });

  test("next slot keeps cadence and skips missed slots without catch-up", () => {
    const slot = new Date("2026-11-05T00:00:00.000Z");
    assert.equal(nextSlotAfter(slot, 60, new Date("2026-11-05T00:00:10.000Z")).toISOString(), "2026-11-05T01:00:00.000Z");
    assert.equal(nextSlotAfter(slot, 60, new Date("2026-11-05T05:30:00.000Z")).toISOString(), "2026-11-05T06:00:00.000Z");
    assert.equal(nextSlotAfter(slot, 1440, new Date("2026-11-05T00:00:00.000Z")).toISOString(), "2026-11-06T00:00:00.000Z");
  });
});

describe("Queue retry options", () => {
  test("constant-delay tasks never send retryDelayMax (pg-boss rejects it)", async () => {
    const { queueRetryOptions } = await import("@/modules/automation/services/outbox-dispatcher");
    const constant = queueRetryOptions({ maxAttempts: 1, initialDelaySeconds: 0, maxDelaySeconds: 0, backoffMultiplier: 1 });
    assert.deepEqual(constant, { retryLimit: 0, retryDelay: 0, retryBackoff: false });
    const exp = queueRetryOptions({ maxAttempts: 3, initialDelaySeconds: 30, maxDelaySeconds: 900, backoffMultiplier: 2 });
    assert.deepEqual(exp, { retryLimit: 2, retryDelay: 30, retryBackoff: true, retryDelayMax: 900 });
  });
});
