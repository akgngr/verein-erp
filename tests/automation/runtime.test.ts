import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { resolveAutomationRuntimeConfig } from "../../src/modules/automation/runtime-config";

describe("Automation runtime gates", () => {
  test("keeps automation and worker disabled when no variables are configured", () => {
    assert.deepEqual(resolveAutomationRuntimeConfig({}), {
      enabled: false,
      workerEnabled: false,
    });
  });

  test("allows the application feature without starting a worker", () => {
    assert.deepEqual(resolveAutomationRuntimeConfig({ AUTOMATION_ENABLED: "true" }), {
      enabled: true,
      workerEnabled: false,
    });
  });

  test("does not allow the worker when automation itself is disabled", () => {
    assert.deepEqual(resolveAutomationRuntimeConfig({ AUTOMATION_WORKER_ENABLED: "true" }), {
      enabled: false,
      workerEnabled: false,
    });
  });

  test("enables the worker only when both switches are true", () => {
    assert.deepEqual(resolveAutomationRuntimeConfig({
      AUTOMATION_ENABLED: "true",
      AUTOMATION_WORKER_ENABLED: "true",
    }), {
      enabled: true,
      workerEnabled: true,
    });
  });
});
