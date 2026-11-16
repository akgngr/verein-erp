import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {proposalAcknowledgementSchema} from "@/shared/ai/dataset";
import {PROPOSED} from "@/shared/ai/define";
import {can} from "@/shared/permissions/define";
import {tasksPermissions} from "../permissions";
import {getAiTaskTarget} from "../queries/ai-target";
export const taskId = z.object({ taskId: z.string().min(1).max(100) });
export const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
});

/** Server-only proposal definitions; domain actions are invoked only by explicit confirmation. */
export const aiProposalTools=[
aiToolV2({
      name: "propose_task",
      operation: "create",
      allowed: (user) => can(user.role, tasksPermissions, "create"),
      description: "PROPOSES a new task to the user. Nothing is created: the user confirms it from a card in the panel, with their own permissions. Do not put personal names or contact details in it.", // i18n-ignore (model-facing tool text)
      input:(createSchema).strict(),
      result:proposalAcknowledgementSchema,modelOutput:proposalAcknowledgementSchema,
      policy:{"purpose":"tasks-proposal","serverReads":[],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async (input, { propose }) => {
        propose({ action: "create", title: input.title, details: [input.priority, input.dueDate ?? "", input.description ?? ""].filter(Boolean), payload: input });
        return PROPOSED;
      },
    }),
aiToolV2({
      name: "propose_complete_task",
      operation: "update",
      allowed: (user) => can(user.role, tasksPermissions, "update"),
      description: "PROPOSES marking a task as done (id from list_open_tasks). Nothing changes until the user confirms.", // i18n-ignore (model-facing tool text)
      input:(taskId).strict(),
      result:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),modelOutput:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),
      policy:{"purpose":"tasks-proposal","serverReads":["Task"],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async ({ taskId }, { propose }) => {
        const task = await getAiTaskTarget(taskId);
        if (!task) return { status: "not_found" } as const;
        propose({ action: "complete", title: task.title, payload: { taskId: task.id } });
        return PROPOSED;
      },
    }),
aiToolV2({
      name: "propose_delete_task",
      operation: "delete",
      allowed: (user) => can(user.role, tasksPermissions, "delete"),
      description: "PROPOSES deleting a task (id from list_open_tasks). Nothing is deleted until the user confirms.", // i18n-ignore (model-facing tool text)
      input:(taskId).strict(),
      result:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),modelOutput:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),
      policy:{"purpose":"tasks-proposal","serverReads":["Task"],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async ({ taskId }, { propose }) => {
        const task = await getAiTaskTarget(taskId);
        if (!task) return { status: "not_found" } as const;
        propose({ action: "delete", title: task.title, payload: { taskId: task.id } });
        return PROPOSED;
      },
    })
];
