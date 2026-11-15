import "server-only";
import {getDb} from "@/shared/db";

/** Only an explicitly stored memberId is identity evidence. A parent/payer link is not identity. */
export async function getStudentMemberLink(id:string):Promise<string|null>{
 const row=await getDb().student.findFirst({where:{id,deletedAt:null},select:{memberId:true}});
 return row?.memberId??null;
}
export async function getGuardianMemberLink(id:string):Promise<string|null>{
 const row=await getDb().studentGuardian.findFirst({where:{id,deletedAt:null},select:{memberId:true}});
 return row?.memberId??null;
}
