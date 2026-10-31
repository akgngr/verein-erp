import "server-only";

import { z } from "zod";

import { aiAction, aiTool, defineModuleAi, PROPOSED } from "@/shared/ai/define";
import { parseListParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { completeTaskAction, createTaskAction, deleteTaskAction, getTask, listTasks, TASK_DEFAULT_SORT, TASK_SORTABLE_FIELDS, tasksPermissions } from "./server";

/** Görevler modülünün asistan sözleşmesi (bkz. src/shared/ai/define.ts). Atanan kişi verisi dönmez. */
const taskId = z.object({ taskId: z.string().min(1).max(100) });
const TASK_ID_INPUT = { type: "object", properties: { taskId: { type: "string" } }, required: ["taskId"], additionalProperties: false };

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

export const ai = defineModuleAi({
  module: "tasks",
  tools: [
    aiTool({
      name: "list_open_tasks",
      operation: "read",
      allowed: (user) => can(user.role, tasksPermissions, "view"),
      description: "Open and in-progress tasks: id, title, status, priority, due date, overdue flag. No assignee data. Use the id for propose_complete_task / propose_delete_task. mine=true returns only the current user's tasks.", // i18n-ignore (model-facing tool text)
      schema: z.object({ mine: z.boolean() }),
      inputSchema: {
        type: "object",
        properties: { mine: { type: "boolean", description: "Only tasks assigned to the current user" } }, // i18n-ignore (model-facing tool text)
        required: ["mine"],
        additionalProperties: false,
      },
      run: async ({ mine }, { user }) => {
        const params = parseListParams(
          { pageSize: "50", ...(mine ? { mine: "1" } : {}) },
          { sortableFields: TASK_SORTABLE_FIELDS, defaultSort: TASK_DEFAULT_SORT, filterKeys: ["status", "priority", "memberId", "mine", "overdue"] },
        );
        const result = await listTasks(params, user);
        return result.rows
          .filter((task) => task.status === "OPEN" || task.status === "IN_PROGRESS")
          .map((task) => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, dueDate: task.dueDate, overdue: task.isOverdue }));
      },
    }),
    aiTool({
      name: "propose_task",
      operation: "create",
      allowed: (user) => can(user.role, tasksPermissions, "create"),
      description: "PROPOSES a new task to the user. Nothing is created: the user confirms it from a card in the panel, with their own permissions. Do not put personal names or contact details in it.", // i18n-ignore (model-facing tool text)
      schema: createSchema,
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: ["string", "null"] },
          priority: { type: "string", enum: ["LOW", "NORMAL", "HIGH"] },
          dueDate: { type: ["string", "null"], description: "YYYY-MM-DD" }, // i18n-ignore (model-facing tool text)
        },
        required: ["title", "description", "priority", "dueDate"],
        additionalProperties: false,
      },
      run: async (input, { propose }) => {
        propose({ action: "create", title: input.title, details: [input.priority, input.dueDate ?? "", input.description ?? ""].filter(Boolean), payload: input });
        return PROPOSED;
      },
    }),
    aiTool({
      name: "propose_complete_task",
      operation: "update",
      allowed: (user) => can(user.role, tasksPermissions, "update"),
      description: "PROPOSES marking a task as done (id from list_open_tasks). Nothing changes until the user confirms.", // i18n-ignore (model-facing tool text)
      schema: taskId,
      inputSchema: TASK_ID_INPUT,
      run: async ({ taskId }, { propose }) => {
        const task = await getTask(taskId);
        if (!task) return { status: "not_found" };
        propose({ action: "complete", title: task.title, payload: { taskId: task.id } });
        return PROPOSED;
      },
    }),
    aiTool({
      name: "propose_delete_task",
      operation: "delete",
      allowed: (user) => can(user.role, tasksPermissions, "delete"),
      description: "PROPOSES deleting a task (id from list_open_tasks). Nothing is deleted until the user confirms.", // i18n-ignore (model-facing tool text)
      schema: taskId,
      inputSchema: TASK_ID_INPUT,
      run: async ({ taskId }, { propose }) => {
        const task = await getTask(taskId);
        if (!task) return { status: "not_found" };
        propose({ action: "delete", title: task.title, payload: { taskId: task.id } });
        return PROPOSED;
      },
    }),
  ],
  actions: {
    create: aiAction({
      operation: "create",
      schema: createSchema,
      execute: (input) => createTaskAction({ ...input, status: "OPEN" }),
    }),
    complete: aiAction({ operation: "update", schema: taskId, execute: ({ taskId }) => completeTaskAction({ id: taskId }) }),
    delete: aiAction({ operation: "delete", schema: taskId, execute: ({ taskId }) => deleteTaskAction({ id: taskId }) }),
  },
});
