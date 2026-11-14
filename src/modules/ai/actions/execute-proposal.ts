"use server";

import { getDb } from "@/shared/db";
import { z } from "zod";

import type { ActionResult } from "@/shared/types/action";

import { moduleAiRegistry } from "@/ai-registry";
import { ActionError, createAction } from "@/modules/auth/server";

import { requireCurrentAiAccess } from "../services/access";
import { aiPermissions } from "../permissions";
import { getAiPermissions, isAllowed } from "../services/permissions";

import { requestDatasetExport,exportPlanSchema } from "../services/dataset-export";
import { claimProposal, finalizeProposal, proposalPreconditionMatches } from "../services/proposal-store";
import { providerRevision } from "../services/provider-revision";
const proposalSchema = z.object({ proposalId:z.string().min(1).max(100) }).strict();

/**
 * Kullanıcının onayladığı asistan önerisini, önerinin ait olduğu modülün ai.ts eylemiyle uygular.
 * Denetimler: (1) eylem modülde tanımlı; işlem türü istemciden DEĞİL, modülün eylem tanımından
 * okunur, (2) bu modül + işlem izin matrisinde hâlâ açık, (3) payload modülün şemasıyla yeniden
 * doğrulanır, (4) asıl işi yapan modül eylemi kullanıcının KENDİ rol yetkisini ayrıca denetler.
 */
export async function executeAiProposalAction(input: unknown): Promise<ActionResult<{jobId?:string}>> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "view" },
    schema: proposalSchema,
    handler: async ({ input, user, audit }) => {
      const access = await requireCurrentAiAccess(user.id);
      const claim = await claimProposal(user.id,input.proposalId,await providerRevision(access.provider));
      if(claim.applied) return {jobId:claim.row.executionId ?? undefined};
      let jobId:string|undefined;
      try {
        const {row}=claim;
        if(!access.modules.includes(row.moduleKey)) throw new ActionError("ai.errors.permissionRevoked");
        const action=moduleAiRegistry.find(entry=>entry.module===row.moduleKey)?.actions[row.actionKey];
        if(!action || !isAllowed(await getAiPermissions(),row.moduleKey,action.operation)) throw new ActionError("ai.errors.permissionRevoked");
        const payload=action.schema.safeParse(claim.payload);
        if(!payload.success) throw new ActionError("common.errors.formInvalid");
        if(action.snapshot && !proposalPreconditionMatches(row.preconditionsEnc,await action.snapshot(payload.data))) throw new ActionError("ai.errors.staleProposal");
        const result=await action.execute(payload.data,{user:access.user,conversationId:claim.row.conversationId ?? "",proposalId:claim.row.id,requestDatasetExport:plan=>requestDatasetExport(exportPlanSchema.parse(plan),{userId:user.id,conversationId:claim.row.conversationId ?? "",proposalId:claim.row.id})});
        if(!result.ok) throw new ActionError(result.error ?? "common.errors.unexpected");
        jobId=result.jobId;
        if(result.jobId) await getDb().aiProposal.update({where:{id:row.id},data:{executionId:result.jobId}});
        await finalizeProposal(row.id,true);
        await audit({action:"AI_PROPOSAL_APPLIED",entity:"AiProposal",entityId:row.id,after:{module:row.moduleKey,action:row.actionKey}});
      } catch(error) {
        await finalizeProposal(claim.row.id,false);
        throw error;
      }
      return {jobId};
    },
  });
  return run(input);
}
