"use server";
import { z } from "zod";
import { createAction,ActionError } from "@/modules/auth/server";
import {getAiExportStatus} from "../services/export-status";
import { aiPermissions } from "../permissions";
export async function getAiExportStatusAction(input:unknown) {
 return createAction({permission:{definition:aiPermissions,action:"view"},schema:z.object({id:z.string().min(1).max(128)}).strict(),handler:async({input,user})=>{
  const result=await getAiExportStatus(user.id,input.id);
  if(!result)throw new ActionError("common.errors.notFound");
  return result;
 }})(input);
}
