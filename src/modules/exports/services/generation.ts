import "server-only";
import {Prisma,type FileGeneration} from "@prisma/client";
import {z} from "zod";
import {getDb} from "@/shared/db";
import type {TaskDefinition} from "@/shared/automation/define";
import {assertActiveExecutionLease,assertTaskModulesUsable,assertFileGenerationTask,getExecutionState,getAutomationRuntimeConfig,insertTaskExecution} from "@/modules/automation/public/file-generation";
import {getModuleAvailability} from "@/modules/system/automation";
import {getPublishedFileMetadata} from "./file-metadata";
import {FILES_RETENTION_DAYS} from "../constants";

const requestSchema=z.object({id:z.string().regex(/^[A-Za-z0-9_-]{1,128}$/),organizationId:z.string().min(1).max(128),ownerId:z.string().min(1).max(128),sourceModule:z.string().regex(/^[a-z][a-z0-9-]{1,63}$/),purpose:z.string().regex(/^[a-z][a-z0-9_.-]{1,79}$/),format:z.enum(["csv","xlsx"]),idempotencyKey:z.string().min(1).max(200),deadlineAt:z.date()}).strict();
type GenerationRequest=z.infer<typeof requestSchema>&{task:TaskDefinition};
const preparedBrand=Symbol("prepared-generation-request");
export type PreparedGenerationRequest=GenerationRequest&{readonly [preparedBrand]:true};
export type GenerationLease={id:string;ownerId:string;organizationId:string;executionId:string;leaseToken:number};
const activeStates=["QUEUED","PROCESSING"];

/** Caller authorizes the source/actor. Availability checks run before any caller transaction. */
export async function prepareGenerationRequest(input:GenerationRequest):Promise<PreparedGenerationRequest>{
 const {task,...data}=input;const parsed=requestSchema.parse(data);
 if(!getAutomationRuntimeConfig().enabled)throw new Error("FILE_GENERATION_DISABLED");
 if(parsed.deadlineAt<=new Date())throw new Error("FILE_GENERATION_EXPIRED");
 if(!task.key.startsWith(`${parsed.sourceModule}.`)||!Number.isSafeInteger(task.version)||task.version<1)throw new Error("FILE_GENERATOR_INVALID");
 await assertTaskModulesUsable(task.key,parsed.sourceModule);
 await assertFileGenerationTask(task,parsed.id);
 if(await getModuleAvailability("exports")!=="available")throw new Error("FILE_MODULE_UNAVAILABLE");
 return Object.freeze({...parsed,task,[preparedBrand]:true as const});
}
function keyOf(args:GenerationRequest){return {organizationId:args.organizationId,ownerId:args.ownerId,sourceModule:args.sourceModule,idempotencyKey:args.idempotencyKey};}
function assertSameRequest(row:FileGeneration,args:GenerationRequest){
 if(row.format!==args.format||row.purpose!==args.purpose||row.generatorKey!==args.task.key||row.generatorVersion!==args.task.version)throw new Error("FILE_GENERATION_IDEMPOTENCY_CONFLICT");
}
async function insertGeneration(tx:Prisma.TransactionClient,args:PreparedGenerationRequest){
 const existing=await tx.fileGeneration.findUnique({where:{requestKey:keyOf(args)}});
 if(existing){assertSameRequest(existing,args);if(!existing.executionId)throw new Error("FILE_GENERATION_INCOMPLETE");return {id:existing.id,executionId:existing.executionId};}
 await tx.fileGeneration.create({data:{id:args.id,...keyOf(args),purpose:args.purpose,generatorKey:args.task.key,generatorVersion:args.task.version,format:args.format,deadlineAt:args.deadlineAt,expiresAt:new Date(Date.now()+FILES_RETENTION_DAYS*86400000)}});
 const execution=await insertTaskExecution(tx,{task:args.task,organizationId:args.organizationId,requestedById:args.ownerId,sourceModule:args.sourceModule,correlationId:args.id,idempotencyKey:`file-generation:${args.id}`,input:{generationId:args.id},context:{}});
 await tx.fileGeneration.update({where:{id:args.id},data:{executionId:execution.id}});
 return {id:args.id,executionId:execution.id};
}
/** Metadata and the existing automation execution/outbox commit together; no second queue. */
export async function requestGeneration(args:PreparedGenerationRequest,tx?:Prisma.TransactionClient){
 if(args[preparedBrand]!==true)throw new Error("FILE_GENERATION_NOT_PREPARED");
 if(tx)return insertGeneration(tx,args);
 try{return await getDb().$transaction(client=>insertGeneration(client,args));}
 catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002"){
   const existing=await getDb().fileGeneration.findUnique({where:{requestKey:keyOf(args)}});
   if(existing?.executionId){assertSameRequest(existing,args);return {id:existing.id,executionId:existing.executionId};}
  }
  throw error;
 }
}
export function generationAttemptFileId(id:string,leaseToken:number):string{
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(id)||!Number.isSafeInteger(leaseToken)||leaseToken<1)throw new Error("FILE_GENERATION_INVALID_ATTEMPT");
 return `${id}-attempt-${leaseToken}`;
}
function leaseWhere(lease:GenerationLease){return {id:lease.id,ownerId:lease.ownerId,organizationId:lease.organizationId,executionId:lease.executionId};}
export async function startGeneration(lease:GenerationLease){
 await getDb().$transaction(async tx=>{
  await assertActiveExecutionLease(tx,lease.executionId,lease.leaseToken);
  const started=await tx.fileGeneration.updateMany({where:{...leaseWhere(lease),status:{in:activeStates},leaseToken:{lte:lease.leaseToken},deadlineAt:{gt:new Date()},expiresAt:{gt:new Date()}},data:{status:"PROCESSING",leaseToken:lease.leaseToken,errorCode:null}});
  if(started.count!==1)throw new Error("FILE_GENERATION_UNAVAILABLE");
 });
 return generationAttemptFileId(lease.id,lease.leaseToken);
}
/** Source status may be finalized in the same transaction by the caller. */
export async function finalizeGeneration(tx:Prisma.TransactionClient,lease:GenerationLease,fileId:string){
 await assertActiveExecutionLease(tx,lease.executionId,lease.leaseToken);
 if(fileId!==generationAttemptFileId(lease.id,lease.leaseToken))throw new Error("FILE_GENERATION_INVALID_ATTEMPT");
 const pendingBytes=await tx.generatedFile.findFirst({where:{id:fileId,generationId:lease.id,ownerId:lease.ownerId,publicationPending:true,deletionPending:false,sha256:{not:null},expiresAt:{gt:new Date()}},select:{expiresAt:true}});
 if(!pendingBytes)throw new Error("FILE_GENERATION_BYTES_UNAVAILABLE");
 const updated=await tx.fileGeneration.updateMany({where:{...leaseWhere(lease),status:"PROCESSING",leaseToken:lease.leaseToken,deadlineAt:{gt:new Date()},expiresAt:{gt:new Date()}},data:{status:"READY",fileId,expiresAt:pendingBytes.expiresAt,errorCode:null}});
 if(updated.count!==1)throw new Error("FILE_GENERATION_UNAVAILABLE");
 const published=await tx.generatedFile.updateMany({where:{id:fileId,generationId:lease.id,ownerId:lease.ownerId,publicationPending:true,deletionPending:false,sha256:{not:null},expiresAt:{gt:new Date()}},data:{publicationPending:false}});
 if(published.count!==1)throw new Error("FILE_GENERATION_BYTES_UNAVAILABLE");
}
export async function recordGenerationAttempt(lease:GenerationLease,state:"QUEUED"|"FAILED"|"CANCELLED",code:string){
 const errorCode=/^[A-Z][A-Z0-9_]{1,79}$/.test(code)?code:"FILE_GENERATION_FAILED";
 return getDb().$transaction(async tx=>{
  await assertActiveExecutionLease(tx,lease.executionId,lease.leaseToken);
  return tx.fileGeneration.updateMany({where:{...leaseWhere(lease),status:{in:activeStates},leaseToken:{lte:lease.leaseToken}},data:{status:state,errorCode}});
 });
}
/** Privacy cancellation is owner/source-scoped and composes with the source transaction. */
export async function cancelSourceGenerations(tx:Prisma.TransactionClient,ownerId:string,sourceModule:string){
 return tx.fileGeneration.updateMany({where:{ownerId,sourceModule,status:{in:activeStates}},data:{status:"CANCELLED",errorCode:"SOURCE_REVOKED"}});
}
export async function getGenerationState(id:string,ownerId:string,organizationId:string){
 let row=await getDb().fileGeneration.findFirst({where:{id,ownerId,organizationId}});if(!row)return null;
 if(row.status==="READY"){
  const file=row.fileId?await getPublishedFileMetadata(ownerId,row.fileId):null;
  if(!file){await getDb().fileGeneration.updateMany({where:{id,ownerId,organizationId,status:"READY"},data:{status:"DELETED",errorCode:"FILE_UNAVAILABLE"}});row=await getDb().fileGeneration.findUniqueOrThrow({where:{id}});}
  return row;
 }
 if(activeStates.includes(row.status)){
  const execution=row.executionId?await getExecutionState(row.executionId,organizationId):null;
  const expired=row.deadlineAt<=new Date()||row.expiresAt<=new Date();
  const terminal=expired||!execution||execution.requestedById!==ownerId||execution.definitionKey!==row.generatorKey||["FAILED","CANCELLED","SUCCEEDED"].includes(execution.status);
  if(terminal){
   await getDb().fileGeneration.updateMany({where:{id,ownerId,organizationId,status:{in:activeStates}},data:{status:expired?"EXPIRED":execution?.status==="CANCELLED"?"CANCELLED":"FAILED",errorCode:expired?"FILE_GENERATION_EXPIRED":"EXECUTION_TERMINAL"}});
   row=await getDb().fileGeneration.findUniqueOrThrow({where:{id}});
  }
 }
 return row;
}
export async function deleteGenerationsOfOwner(ownerId:string){return getDb().fileGeneration.deleteMany({where:{ownerId}});}
export async function purgeGenerationHistory(now=new Date()){
 const rows=await getDb().fileGeneration.findMany({where:{expiresAt:{lte:now}},select:{id:true},take:100});
 await getDb().generatedFile.updateMany({where:{generationId:{in:rows.map(row=>row.id)},publicationPending:true},data:{deletionPending:true}});
 return getDb().fileGeneration.deleteMany({where:{id:{in:rows.map(row=>row.id)}}});
}
