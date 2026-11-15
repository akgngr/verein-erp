import "server-only";
import {getDb} from "@/shared/db";
export async function getLiveMemberIdentity(id:string):Promise<string|null>{
 return (await getDb().member.findFirst({where:{id,deletedAt:null},select:{id:true}}))?.id??null;
}

/** AI takma ad çözümlemesi için canlı (silinmemiş) üye adları. Yetki denetimi çağırandadır. */
export async function getLiveMemberLabels(ids:string[]):Promise<Map<string,string>>{
 if(!ids.length)return new Map();
 const rows=await getDb().member.findMany({where:{id:{in:ids},deletedAt:null},select:{id:true,firstName:true,lastName:true}});
 return new Map(rows.map(row=>[row.id,`${row.firstName} ${row.lastName}`]));
}
