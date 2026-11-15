import "server-only";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getDb } from "@/shared/db";
import { loadDuesDataset,parseDuesDatasetQuery,DUES_DATASET_COLUMNS } from "@/modules/members/automation";
import { createTabularFile,markGeneratedFileForDeletion,datasetExportPlanSchema } from "@/modules/exports/automation";
import { insertTaskExecution } from "@/modules/automation/automation";
import { requireExportWorkerAccess } from "./export-worker-access";
import { loadDataset,tokenDigest,referenceDeployment } from "./references";
import { providerRevision } from "./provider-revision";
import { getActiveProvider } from "./consent";
import { openSecret } from "@/shared/security/secret-box";
import { getAutomationRuntimeConfig } from "@/modules/automation/automation";
import { aiDatasetExportTask } from "../automation";

export const exportPlanSchema=datasetExportPlanSchema;
export async function requestDatasetExport(args:z.infer<typeof exportPlanSchema>,context:{userId:string;conversationId:string;proposalId:string}) {
 if(process.env.AI_PERSONAL_EXPORT_ENABLED!=="true"||!getAutomationRuntimeConfig().enabled)throw new Error("AI_PERSONAL_EXPORT_DISABLED");
 const provider=await getActiveProvider();if(!provider)throw new Error("AI_EXPORT_ACCESS_REVOKED");
 const revision=await providerRevision(provider);await requireExportWorkerAccess(context.userId,revision);
 const dataset=await loadDataset({userId:context.userId,conversationId:context.conversationId,policyRevision:revision},args.datasetRef);
 if(dataset.sourceModule!=="members"||!args.columns.every(c=>Array.isArray(dataset.allowedColumns)&&dataset.allowedColumns.includes(c)))throw new Error("AI_DATASET_COLUMN_DENIED");
 const db=getDb();
 const recover=async()=>{
  const existing=await db.aiExportRequest.findUnique({where:{proposalId:context.proposalId}});
  if(!existing)return null;
  if(existing.userId!==context.userId||existing.conversationId!==context.conversationId||existing.datasetId!==dataset.id||existing.format!==args.format||JSON.stringify(existing.columns)!==JSON.stringify(args.columns))throw new Error("AI_EXPORT_IDEMPOTENCY_CONFLICT");
  return existing.id;
 };
 const existing=await recover();if(existing)return existing;
 const id=randomUUID();
 try{return await db.$transaction(async tx=>{
  const generation=await tx.aiExportRequest.create({data:{id,userId:context.userId,conversationId:context.conversationId,datasetId:dataset.id,providerRevision:revision,format:args.format,columns:args.columns,proposalId:context.proposalId,expiresAt:dataset.expiresAt}});
  const execution=await insertTaskExecution(tx,{task:aiDatasetExportTask,organizationId:referenceDeployment(),requestedById:context.userId,sourceModule:"ai",correlationId:id,idempotencyKey:`ai-export:${id}`,input:{generationId:id},context:{}});
  await tx.aiExportRequest.update({where:{id},data:{executionId:execution.id}});
  return generation.id;
 });}catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002"){
   const existing=await recover();if(existing)return existing;
  }
  throw error;
 }
}
export async function runDatasetExport(generationId:string,signal:AbortSignal,execution?:{userId:string;executionId:string}) {
 if(process.env.AI_PERSONAL_EXPORT_ENABLED!=="true")throw new Error("AI_PERSONAL_EXPORT_DISABLED");
 const db=getDb(),job=await db.aiExportRequest.findUnique({where:{id:generationId}});if(!job)throw new Error("AI_EXPORT_NOT_FOUND");
 if(execution&&(job.userId!==execution.userId||job.executionId!==execution.executionId))throw new Error("AI_EXPORT_EXECUTION_MISMATCH");
 if(job.status!=="QUEUED" && job.status!=="READY")throw new Error("AI_EXPORT_CANCELLED");
 if(job.status==="READY"&&job.fileId)return {generationId:job.id,status:"READY"};
 await requireExportWorkerAccess(job.userId,job.providerRevision);signal.throwIfAborted();
 const dataset=await db.aiDataset.findFirst({where:{id:job.datasetId,expiresAt:{gt:new Date()},scope:{userId:job.userId,conversationId:job.conversationId,policyRevision:job.providerRevision,deploymentId:referenceDeployment(),revokedAt:null,expiresAt:{gt:new Date()}}}});
 if(!dataset||job.expiresAt<=new Date())throw new Error("AI_DATASET_UNAVAILABLE");
 const definition=parseDuesDatasetQuery(JSON.parse(openSecret("ai-dataset",dataset.definitionEnc)??"null"));
 const selectionText=openSecret("ai-dataset",dataset.selectionEnc);
 if(!selectionText||tokenDigest(selectionText)!==dataset.selectionHash||dataset.sourceModule!=="members")throw new Error("AI_DATASET_UNREADABLE");
 const selection=z.object({fingerprint:z.string()}).strict().parse(JSON.parse(openSecret("ai-dataset",dataset.selectionEnc)??"null"));
 const current=await loadDuesDataset(definition);
 if(current.fingerprint!==selection.fingerprint)throw new Error("AI_DATASET_STALE_PREVIEW");
 const columns=z.array(z.enum(DUES_DATASET_COLUMNS)).parse(job.columns);
 const rowValues=current.rows.map(row=>columns.map(column=>column==="member.fullName"?row.fullName:column==="dues.year"?row.year:row.remainingCents/100));
 signal.throwIfAborted();await requireExportWorkerAccess(job.userId,job.providerRevision);
 const fileId=await createTabularFile({id:job.id,ownerId:job.userId,format:z.enum(["csv","xlsx"]).parse(job.format),headers:columns,rows:rowValues,source:"members.dues"});
 try {
  signal.throwIfAborted();await requireExportWorkerAccess(job.userId,job.providerRevision);
  const scope=await db.aiReferenceScope.findFirst({where:{id:dataset.scopeId,revokedAt:null,expiresAt:{gt:new Date()}}});
  if(!scope)throw new Error("AI_DATASET_UNAVAILABLE");
  const committed=await db.aiExportRequest.updateMany({where:{id:job.id,status:"QUEUED",expiresAt:{gt:new Date()}},data:{status:"READY",fileId}});
  if(committed.count!==1)throw new Error("AI_EXPORT_CANCELLED");
 }catch(error){
  await markGeneratedFileForDeletion(fileId,job.userId);
  throw error;
 }
 return {generationId:job.id,status:"READY"};
}
