import "server-only";
import {getDb} from "@/shared/db";
/** AI proposals never load notes, attachments, teachers or attendee identities. */
export async function getAiDocumentTarget(id:string){return getDb().document.findFirst({where:{id,deletedAt:null},select:{id:true,registryNumber:true,subject:true}});}
