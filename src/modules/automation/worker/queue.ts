import { z } from "zod";

export const AUTOMATION_TASK_QUEUE = "verein-automation-tasks-v1";

export const automationTaskQueuePayloadSchema = z.object({
  executionId: z.string().min(1),
  taskKey: z.string().min(1),
  taskVersion: z.number().int().positive(),
}).strict();

export type AutomationTaskQueuePayload = z.infer<typeof automationTaskQueuePayloadSchema>;
