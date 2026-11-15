import "server-only";
import {getDb} from "@/shared/db";
/** A proposal needs no assignment identity, description or related meeting. */
export async function getAiTaskTarget(id:string){return getDb().task.findUnique({where:{id},select:{id:true,title:true}});}
