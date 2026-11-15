import "server-only";
import {getDb} from "@/shared/db";
/** AI proposals never load notes, attachments, teachers or attendee identities. */
export async function getAiMeetingTarget(id:string){return getDb().meeting.findFirst({where:{id,deletedAt:null},select:{id:true,meetingNumber:true,title:true}});}
