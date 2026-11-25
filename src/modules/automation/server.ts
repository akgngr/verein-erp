import "server-only";

export { automationPermissions } from "./permissions";
export { automationTasks, defineTaskRegistry } from "./tasks/registry";
export {
  createTaskExecutionRecord,
  getTaskExecutionRecord,
  type CreateTaskExecutionRecordInput,
} from "./services/execution-store";
export {
  enqueueTask,
  getExecution,
  cancelExecution,
  retryExecution,
  type EnqueueTaskOptions,
} from "./services/execution-control";
export { scheduleTask, listSchedules, listSchedulableTasks } from "./services/schedules";
// Modül sağlık kokpiti (system): kaynak modül başına başarısız/çalışan yürütmeler (#583).
export { getAutomationHealthByModule, type AutomationModuleHealth } from "./queries/health-snapshot";
