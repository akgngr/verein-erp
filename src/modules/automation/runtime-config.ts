import "server-only";

import { getEnv } from "@/shared/env";

export type AutomationRuntimeConfig = {
  enabled: boolean;
  workerEnabled: boolean;
};

/** Pure resolver kept separate so environment combinations can be tested without app secrets. */
export function resolveAutomationRuntimeConfig(env: {
  AUTOMATION_ENABLED?: string;
  AUTOMATION_WORKER_ENABLED?: string;
}): AutomationRuntimeConfig {
  const enabled = env.AUTOMATION_ENABLED === "true";
  return {
    enabled,
    workerEnabled: enabled && env.AUTOMATION_WORKER_ENABLED === "true",
  };
}

/** Reads validated environment settings. Worker startup must use workerEnabled, never enabled alone. */
export function getAutomationRuntimeConfig(): AutomationRuntimeConfig {
  const env = getEnv();
  return resolveAutomationRuntimeConfig(env);
}
