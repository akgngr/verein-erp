import "server-only";
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
 if(permanent||!execution||context.attempt>=execution.maxAttempts){
  await getDb().aiExportRequest.updateMany({where:{id:generationId,executionId:context.executionId,userId:context.requestedById??"",status:"QUEUED"},data:{status:"FAILED"}});
 }
 if(permanent)throw new PermanentTaskError(error instanceof Error&&/^[A-Z_]+$/.test(error.message)?error.message:"AI_EXPORT_INVALID_PLAN");
 throw error;
}
