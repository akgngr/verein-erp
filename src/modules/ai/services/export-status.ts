import "server-only";
import {getDb} from "@/shared/db";
import {getExecutionState} from "@/modules/automation/automation";
import {referenceDeployment} from "./references";

export async function getAiExportStatus(userId:string,id:string){
 const row=await getDb().aiExportRequest.findFirst({where:{id,userId},select:{status:true,fileId:true,format:true,expiresAt:true,executionId:true}});
 if(!row)return null;
 const failed={status:"FAILED" as const,url:null,format:row.format};
 if(row.expiresAt<=new Date()||row.status==="FAILED"||row.status==="CANCELLED")return failed;
 if(row.status==="READY")return row.fileId?{status:"READY" as const,url:`/api/exports/${row.fileId}`,format:row.format}:failed;
 const execution=row.executionId?await getExecutionState(row.executionId,referenceDeployment()):null;
 const terminal=!execution||execution.requestedById!==userId||execution.definitionKey!=="ai.export_dataset"||["FAILED","CANCELLED","SUCCEEDED"].includes(execution.status);
 if(terminal){
  const changed=await getDb().aiExportRequest.updateMany({where:{id,userId,status:"QUEUED"},data:{status:execution?.status==="CANCELLED"?"CANCELLED":"FAILED"}});
  if(changed.count===0){
   const current=await getDb().aiExportRequest.findFirst({where:{id,userId},select:{status:true,fileId:true,expiresAt:true}});
   if(current?.status==="READY"&&current.fileId&&current.expiresAt>new Date())return {status:"READY" as const,url:`/api/exports/${current.fileId}`,format:row.format};
  }
  return failed;
 }
 return {status:"QUEUED" as const,url:null,format:row.format};
}
