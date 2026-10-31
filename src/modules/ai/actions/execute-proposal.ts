"use server";

import { z } from "zod";

import type { ActionResult } from "@/shared/types/action";

import { moduleAiRegistry } from "@/ai-registry";
import { ActionError, createAction } from "@/modules/auth/server";

import { aiPermissions } from "../permissions";
import { getAiPermissions, isAllowed } from "../services/permissions";

const id = z.string().min(1).max(100);
const proposalSchema = z.object({
  kind: z.literal("module"),
  module: id,
  action: id,
  operation: z.enum(["read", "create", "update", "delete"]),
  title: z.string().max(400),
  details: z.array(z.string().max(400)).max(10),
  payload: z.unknown(),
});

/**
 * Kullanıcının onayladığı asistan önerisini, önerinin ait olduğu modülün ai.ts eylemiyle uygular.
 * Denetimler: (1) eylem modülde tanımlı; işlem türü istemciden DEĞİL, modülün eylem tanımından
 * okunur, (2) bu modül + işlem izin matrisinde hâlâ açık, (3) payload modülün şemasıyla yeniden
 * doğrulanır, (4) asıl işi yapan modül eylemi kullanıcının KENDİ rol yetkisini ayrıca denetler.
 */
export async function executeAiProposalAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "view" },
    schema: proposalSchema,
    handler: async ({ input, audit }) => {
      const action = moduleAiRegistry.find((entry) => entry.module === input.module)?.actions[input.action];
      if (!action) throw new ActionError("common.errors.unexpected");
      if (!isAllowed(await getAiPermissions(), input.module, action.operation)) throw new ActionError("ai.errors.permissionRevoked");
      const payload = action.schema.safeParse(input.payload);
      if (!payload.success) throw new ActionError("common.errors.formInvalid");
      const result = await action.execute(payload.data);
      if (!result.ok) throw new ActionError(result.error ?? "common.errors.unexpected");
      await audit({ action: "AI_PROPOSAL_APPLIED", entity: "AiAssistant", entityId: undefined, after: { module: input.module, action: input.action, operation: action.operation } });
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
