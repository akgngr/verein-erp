// automation modülü — izomorfik public giriş (istemci + sunucu)
export { moduleConfig } from "./module.config";
export { automationPermissions } from "./permissions";
export type {
  TaskDefinition,
  TaskExecutionContext,
  TaskRetryPolicy,
} from "@/shared/automation/define";
