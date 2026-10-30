"use server";

import { z } from "zod";

import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";
import { createEventAction } from "@/modules/events/server";
import { completeTaskAction, createTaskAction, deleteTaskAction } from "@/modules/tasks/server";

import { aiPermissions } from "../permissions";
import { getAiPermissions, isAllowed } from "../services/permissions";
import { PROPOSAL_PERMISSION } from "../services/tools";

const proposalSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("createTask"), title: z.string().min(1).max(200), description: z.string().max(2000).nullable(), priority: z.enum(["LOW", "NORMAL", "HIGH"]), dueDate: z.string().nullable() }),
  z.object({ kind: z.literal("completeTask"), taskId: z.string().min(1), title: z.string() }),
  z.object({ kind: z.literal("deleteTask"), taskId: z.string().min(1), title: z.string() }),
  z.object({
    kind: z.literal("createEvent"),
    title: z.string().min(3).max(200),
    description: z.string().max(2000).nullable(),
    type: z.enum(["WORKSHOP", "SEMINAR", "SOCIAL", "CULTURAL", "SPORTS", "OTHER"]),
    startDate: z.string(),
    endDate: z.string().nullable(),
    location: z.string().max(200).nullable(),
    isOnline: z.boolean(),
  }),
]);

/**
 * Kullanıcının onayladığı asistan önerisini uygular. Üç denetim: önerinin modül + işlemi izin
 * matrisinde hâlâ açık mı; asistanı kullanma yetkisi; ve asıl işlemi yapan modül eylemi
 * kullanıcının KENDİ rol yetkisini ayrıca denetler.
 */
export async function executeAiProposalAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "view" },
    schema: proposalSchema,
    handler: async ({ input, audit }) => {
      const required = PROPOSAL_PERMISSION[input.kind];
      if (!isAllowed(await getAiPermissions(), required.module, required.operation)) throw new ActionError("ai.errors.permissionRevoked");

      let result: { ok: boolean; error?: string };
      switch (input.kind) {
        case "createTask":
          result = await createTaskAction({ title: input.title, description: input.description, status: "OPEN", priority: input.priority, dueDate: input.dueDate });
          break;
        case "completeTask":
          result = await completeTaskAction({ id: input.taskId });
          break;
        case "deleteTask":
          result = await deleteTaskAction({ id: input.taskId });
          break;
        case "createEvent": {
          const created = await createEventAction({
            title: input.title,
            description: input.description,
            type: input.type,
            status: "DRAFT",
            startDate: input.startDate,
            endDate: input.endDate,
            location: input.location,
            isOnline: input.isOnline,
          });
          result = { ok: created.success, error: created.error ?? undefined };
          break;
        }
      }
      if (!result.ok) throw new ActionError(result.error ?? "common.errors.unexpected");
      await audit({ action: "AI_PROPOSAL_APPLIED", entity: "AiAssistant", entityId: undefined, after: { kind: input.kind, module: required.module, operation: required.operation } });
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
