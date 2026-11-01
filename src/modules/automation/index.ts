// automation modülü — izomorfik public giriş (istemci + sunucu)
export { moduleConfig, automationPermissions } from "./module.config";
export type {
  TaskDefinition,
  TaskExecutionContext,
  TaskRetryPolicy,
} from "@/shared/automation/define";
