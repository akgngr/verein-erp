import "server-only";
import { createHash, randomBytes } from "node:crypto";
import {cancelSourceGenerations} from "@/modules/exports/automation";
import { getDb } from "@/shared/db";
import { sealSecret, openSecret } from "@/shared/security/secret-box";

export const tokenDigest = (token: string) => createHash("sha256").update(token).digest("hex");
export const newOpaqueToken = () => randomBytes(32).toString("base64url");
export const referenceDeployment = () => process.env.AI_DEPLOYMENT_ID ?? "single-deployment";
export type ReferenceActor = { userId: string; conversationId: string; policyRevision: string };

export async function createReferenceScope(actor: ReferenceActor, purpose: string) {
  return getDb().aiReferenceScope.create({data:{...actor,purpose,deploymentId:referenceDeployment(),expiresAt:new Date(Date.now()+30*60_000)}});
}
function scopeWhere(actor:ReferenceActor) {
  return {...actor,deploymentId:referenceDeployment(),revokedAt:null,expiresAt:{gt:new Date()}};
}
export async function createEntityReference(actor:ReferenceActor,scopeId:string,resource:"members"|"students"|"guardians"|"users",recordId:string) {
  const scope=await getDb().aiReferenceScope.findFirst({where:{id:scopeId,...scopeWhere(actor)}});
  if(!scope) throw new Error("AI_REFERENCE_UNAVAILABLE");
  const token=newOpaqueToken();
  await getDb().aiEntityReference.create({data:{scopeId,resource,recordId,tokenDigest:tokenDigest(token),expiresAt:scope.expiresAt}});
  return token;
}
export async function resolveEntityReferenceDetails(actor:ReferenceActor,token:string,resource:string) {
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("AI_REFERENCE_UNAVAILABLE");
  const row=await getDb().aiEntityReference.findFirst({where:{tokenDigest:tokenDigest(token),resource,expiresAt:{gt:new Date()},scope:scopeWhere(actor)},select:{recordId:true,scopeId:true}});
  if(!row) throw new Error("AI_REFERENCE_UNAVAILABLE");
  // Caller must still authorize the live source record. A token is never permission.
  return row;
}
export async function resolveEntityReference(actor:ReferenceActor,token:string,resource:string) {
  return (await resolveEntityReferenceDetails(actor,token,resource)).recordId;
}
export async function saveDataset(actor:ReferenceActor,args:{scopeId:string;sourceModule:string;definition:unknown;selection:unknown;columns:string[]}) {
  const db=getDb();
  const scope=await db.aiReferenceScope.findFirst({where:{id:args.scopeId,...scopeWhere(actor)}});
  if(!scope) throw new Error("AI_REFERENCE_UNAVAILABLE");
  const definition=JSON.stringify(args.definition),selection=JSON.stringify(args.selection);
  if(Buffer.byteLength(definition)+Buffer.byteLength(selection)>1_048_576) throw new Error("AI_DATASET_TOO_LARGE");
  const token=newOpaqueToken();
  await db.aiDataset.create({data:{scopeId:scope.id,sourceModule:args.sourceModule,queryVersion:1,tokenDigest:tokenDigest(token),definitionEnc:sealSecret("ai-dataset",definition),selectionEnc:sealSecret("ai-dataset",selection),selectionHash:tokenDigest(selection),allowedColumns:args.columns,expiresAt:scope.expiresAt}});
  return token;
}
export async function loadDataset(actor:ReferenceActor,token:string) {
  const row=await getDb().aiDataset.findFirst({where:{tokenDigest:tokenDigest(token),expiresAt:{gt:new Date()},scope:scopeWhere(actor)}});
  if(!row) throw new Error("AI_DATASET_UNAVAILABLE");
  const selection=openSecret("ai-dataset",row.selectionEnc),definition=openSecret("ai-dataset",row.definitionEnc);
  if(!selection||!definition||tokenDigest(selection)!==row.selectionHash) throw new Error("AI_DATASET_UNREADABLE");
  return {...row,definition:JSON.parse(definition) as unknown,selection:JSON.parse(selection) as unknown};
}
export async function revokeAiReferences(userId:string) {
  const db=getDb();
  await db.$transaction(async tx=>{
    await tx.aiReferenceScope.updateMany({where:{userId,revokedAt:null},data:{revokedAt:new Date()}});
    await tx.aiProposal.updateMany({where:{userId,status:"PENDING"},data:{status:"CANCELLED"}});
    await tx.aiExportRequest.updateMany({where:{userId,status:"QUEUED"},data:{status:"CANCELLED"}});
    await cancelSourceGenerations(tx,userId,"ai");
  });
}
