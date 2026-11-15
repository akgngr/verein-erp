import "server-only";
import {getDb} from "@/shared/db";
export async function getLiveMemberIdentity(id:string):Promise<string|null>{
 return (await getDb().member.findFirst({where:{id,deletedAt:null},select:{id:true}}))?.id??null;
}
