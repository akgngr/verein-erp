import "server-only";
import {aiProposalTools,taskId,createSchema} from "./services/ai-proposal-tools";

import { z } from "zod";
import {aiListCursor,aiListPage,aiPageInfo} from "@/shared/ai/pagination";

import {aiAction, aiTool, defineModuleAi} from "@/shared/ai/define";
import { parseListParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { completeTaskAction, createTaskAction, deleteTaskAction, getTask, listTasks, TASK_DEFAULT_SORT, TASK_SORTABLE_FIELDS, tasksPermissions } from "./server";

/** Görevler modülünün asistan sözleşmesi (bkz. src/shared/ai/define.ts). Atanan kişi verisi dönmez. */

export const ai = defineModuleAi({
  module: "tasks",
  tools: [
    aiTool({
      name: "list_open_tasks",
      operation: "read",
      allowed: (user) => can(user.role, tasksPermissions, "view"),
      description: "Open and in-progress tasks: id, title, status, priority, due date, overdue flag. No assignee data. Use the id for propose_complete_task / propose_delete_task. mine=true returns tasks created by the current user; user/member assignments are not inferred from email or name.", // i18n-ignore (model-facing tool text)
      schema: z.object({ mine: z.boolean(), cursor:aiListCursor, page:z.number().int().min(1).max(1000).optional() }),
      inputSchema: {
        type: "object",
        properties: { cursor:{type:"string",pattern:"^[1-9]\\d{0,3}$"},page:{type:"integer",minimum:1,maximum:1000}, mine: { type: "boolean", description: "Only tasks created by the current user" } }, // i18n-ignore (model-facing tool text)
        required: ["mine"],
        additionalProperties: false,
      },
      run: async ({ mine, cursor, page:requestedPage }, { user }) => {
        const page=cursor?aiListPage(cursor):requestedPage??1;
        const params = parseListParams(
          { pageSize: "50",page:String(page),"filter.status":"__open", ...(mine ? { "filter.mine": "1" } : {}) },
          { sortableFields: TASK_SORTABLE_FIELDS, defaultSort: TASK_DEFAULT_SORT, filterKeys: ["status", "priority", "memberId", "mine", "overdue"] },
        );
        const result = await listTasks(params, {...user,verifiedMemberIds:[]});
        return {...aiPageInfo(page,50,result.total),scope:mine?"created_by_actor":"accessible_tasks",assignmentIdentity:"unlinked",items:result.rows.map((task) => ({ id: task.id, title: task.title, status: task.status, priority: task.priority, dueDate: task.dueDate, overdue: task.isOverdue }))};
      },
    }),
    ...aiProposalTools,

  ],
  actions: {
    create: aiAction({
      operation: "create",
      schema: createSchema,
      execute: (input) => createTaskAction({ ...input, status: "OPEN" }),
    }),
    complete: aiAction({ operation: "update", schema: taskId, snapshot:({taskId})=>getTask(taskId), execute: ({ taskId }) => completeTaskAction({ id: taskId }) }),
    delete: aiAction({ operation: "delete", schema: taskId, snapshot:({taskId})=>getTask(taskId), execute: ({ taskId }) => deleteTaskAction({ id: taskId }) }),
  },
});
