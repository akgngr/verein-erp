import "server-only";

// Dar kapsamlı automation API'si (worker ve diğer modüller için).
// Next.js / UI katmanlarını içe aktarmaz.
export {
  createTaskExecutionRecord,
  type CreateTaskExecutionRecordInput,
} from "./services/execution-store";
export {
  enqueueTask,
  getExecution,
  cancelExecution,
  retryExecution,
  type EnqueueTaskOptions,
} from "./services/execution-control";
export { scheduleTask } from "./services/schedules";
// Diğer modüllerin (ör. Kampanyalar) kendi iş akışlarını oluşturması için; yetki denetimi çağıranın action'ındadır.
export { createWorkflow, saveWorkflowDraft, publishWorkflow, startWorkflow, setWorkflowEnabled, WorkflowPublishError } from "./services/workflows";
