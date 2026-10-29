export const TASK_STATUS_VALUES = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;
export type TaskStatusValue = (typeof TASK_STATUS_VALUES)[number];

export const TASK_PRIORITY_VALUES = ["LOW", "NORMAL", "HIGH"] as const;
export type TaskPriorityValue = (typeof TASK_PRIORITY_VALUES)[number];
