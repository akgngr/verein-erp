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

/** AI takma ad çözümlemesi için canlı öğrenci/veli adları. Yetki denetimi çağırandadır. */
export async function getLiveStudentLabels(ids:string[]):Promise<Map<string,string>>{
 if(!ids.length)return new Map();
 const rows=await getDb().student.findMany({where:{id:{in:ids},deletedAt:null},select:{id:true,firstName:true,lastName:true}});
 return new Map(rows.map(row=>[row.id,`${row.firstName} ${row.lastName}`]));
}
export async function getLiveGuardianLabels(ids:string[]):Promise<Map<string,string>>{
 if(!ids.length)return new Map();
 const rows=await getDb().studentGuardian.findMany({where:{id:{in:ids},deletedAt:null},select:{id:true,firstName:true,lastName:true}});
 return new Map(rows.map(row=>[row.id,`${row.firstName} ${row.lastName}`]));
}
