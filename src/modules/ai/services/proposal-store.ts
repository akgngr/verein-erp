import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getDb } from "@/shared/db";
import { sealSecret, openSecret } from "@/shared/security/secret-box";
import type { AiProposal, AiProposalDraft } from "../types";

const PURPOSE = "ai-proposal";
export const proposalHash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

export async function prepareProposal(args: { userId: string; conversationId: string; revision: string; draft: AiProposalDraft; preconditions?: unknown }): Promise<AiProposal> {
  const { draft } = args;
  const source=args.preconditions && typeof args.preconditions==="object"?args.preconditions as Record<string,unknown>:{};
  const title=String(source.title ?? source.name ?? source.registryNumber ?? draft.title).slice(0,400);
  const details=[...draft.details.slice(0,5),JSON.stringify(draft.payload).slice(0,400)];
  const row = await getDb().aiProposal.create({ data: {
    userId: args.userId, conversationId: args.conversationId, providerRevision: args.revision,
    moduleKey: draft.module, actionKey: draft.action, payloadEnc: sealSecret(PURPOSE, JSON.stringify(draft.payload)),
    previewEnc: sealSecret(PURPOSE, JSON.stringify({title,details})), payloadHash: proposalHash(draft.payload),
    preconditionsEnc: args.preconditions === undefined ? null : sealSecret(PURPOSE, proposalHash(args.preconditions)),
    idempotencyKey: randomUUID(), expiresAt: new Date(Date.now()+15*60_000),
  }, select: { id:true } });
  return { kind:"module", proposalId:row.id, module:draft.module, action:draft.action, operation:draft.operation, title, details };
}

/** Atomic PENDING->EXECUTING claim. An interrupted execution never automatically replays a write. */
export async function claimProposal(userId: string, proposalId: string, revision: string) {
  const db=getDb();
  return db.$transaction(async tx => {
    const row=await tx.aiProposal.findFirst({where:{id:proposalId,userId,providerRevision:revision,expiresAt:{gt:new Date()}}});
    if(!row) throw new Error("AI_PROPOSAL_UNAVAILABLE");
    if(row.status==="APPLIED") return {row,payload:null,applied:true as const};
    const claimed=await tx.aiProposal.updateMany({where:{id:row.id,userId,status:"PENDING",expiresAt:{gt:new Date()}},data:{status:"EXECUTING",confirmedAt:new Date()}});
    if(claimed.count!==1) throw new Error("AI_PROPOSAL_UNAVAILABLE");
    const plain=openSecret(PURPOSE,row.payloadEnc);
    if(!plain) throw new Error("AI_PROPOSAL_UNREADABLE");
    const payload:unknown=JSON.parse(plain);
    if(proposalHash(payload)!==row.payloadHash) throw new Error("AI_PROPOSAL_UNREADABLE");
    return {row,payload,applied:false as const};
  });
}
export function proposalPreconditionMatches(encrypted: string | null, state: unknown): boolean {
  return encrypted===null || openSecret(PURPOSE,encrypted)===proposalHash(state);
}
export async function finalizeProposal(id: string, success: boolean) {
  await getDb().aiProposal.updateMany({where:{id,status:"EXECUTING"},data:{status:success?"APPLIED":"FAILED",completedAt:new Date()}});
}
