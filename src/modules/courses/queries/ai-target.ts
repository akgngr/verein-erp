import "server-only";
import {getDb} from "@/shared/db";
/** AI proposals never load notes, attachments, teachers or attendee identities. */
export async function getAiCourseTarget(id:string){return getDb().course.findFirst({where:{id,deletedAt:null},select:{id:true,code:true,title:true}});}
