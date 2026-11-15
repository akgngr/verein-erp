import "server-only";
import {recordGenerationAttempt} from "@/modules/exports/automation";
import {getDb} from "@/shared/db";
import {getExecutionState} from "@/modules/automation/automation";
import {PermanentTaskError,type TaskExecutionContext} from "@/shared/automation/define";
import {permanentExportFailure} from "./export-retry-policy";
import {recordAiMetric} from "./metrics";

/** Preserve a retryable request after transient failure; an aborted stale worker writes no state. */
export async function failDatasetExportAttempt(generationId:string,context:TaskExecutionContext,error:unknown):Promise<never>{
 await recordAiMetric("export_failed");
 if(context.signal.aborted)throw error;
 const permanent=permanentExportFailure(error);
 const execution=await getExecutionState(context.executionId,context.organizationId);
 const terminal=permanent||!execution||context.attempt>=execution.maxAttempts;
 if(Number.isSafeInteger(context.leaseToken)&&context.leaseToken!>0){
  await recordGenerationAttempt({id:generationId,ownerId:context.requestedById??"",organizationId:context.organizationId,executionId:context.executionId,leaseToken:context.leaseToken!},terminal?(error instanceof Error&&error.message==="AI_EXPORT_CANCELLED"?"CANCELLED":"FAILED"):"QUEUED",error&&typeof error==="object"&&"code" in error&&typeof error.code==="string"?error.code:error instanceof Error?error.message:"FILE_GENERATION_FAILED");
 }
 if(terminal){
  await getDb().aiExportRequest.updateMany({where:{id:generationId,executionId:context.executionId,userId:context.requestedById??"",status:"QUEUED"},data:{status:"FAILED"}});
 }
 if(permanent)throw new PermanentTaskError(error instanceof Error&&/^[A-Z_]+$/.test(error.message)?error.message:"AI_EXPORT_INVALID_PLAN");
 throw error;
}
