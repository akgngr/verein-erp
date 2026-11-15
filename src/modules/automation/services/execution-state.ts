import "server-only";
import type {Prisma} from "@prisma/client";
import {getDb} from "@/shared/db";

/** Worker-safe projection; excludes inputs, logs and personal payloads. */
export async function getExecutionState(executionId:string,organizationId:string){
 return getDb().automationExecution.findFirst({where:{id:executionId,organizationId},select:{id:true,status:true,attempt:true,maxAttempts:true,definitionKey:true,requestedById:true}});
}
/** Lock the execution while a caller commits a fenced worker-owned side effect. */
export async function assertActiveExecutionLease(tx:Prisma.TransactionClient,executionId:string,leaseToken:number){
 if(!Number.isSafeInteger(leaseToken)||leaseToken<1)throw new Error("TASK_LEASE_LOST");
 const locked=await tx.automationExecution.updateMany({where:{id:executionId,status:"RUNNING",leaseToken,leaseExpiresAt:{gt:new Date()}},data:{updatedAt:new Date()}});
 if(locked.count!==1)throw new Error("TASK_LEASE_LOST");
}
