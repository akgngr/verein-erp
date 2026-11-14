"use server";
import { z } from "zod";
import { createAction,ActionError } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import { aiPermissions } from "../permissions";
export async function getAiExportStatusAction(input:unknown) {
 return createAction({permission:{definition:aiPermissions,action:"view"},schema:z.object({id:z.string().min(1).max(128)}).strict(),handler:async({input,user})=>{
  const row=await getDb().aiExportRequest.findFirst({where:{id:input.id,userId:user.id},select:{status:true,fileId:true,format:true,expiresAt:true}});
  if(!row)throw new ActionError("common.errors.notFound");
  return {status:row.status==="READY"?"READY":row.status==="FAILED"||row.expiresAt<new Date()?"FAILED":"QUEUED",url:row.status==="READY"&&row.fileId?`/api/exports/${row.fileId}`:null,format:row.format};
 }})(input);
}
