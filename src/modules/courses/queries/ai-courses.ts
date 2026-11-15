import "server-only";
import {getDb} from "@/shared/db";
import {aiListPage,aiPageInfo} from "@/shared/ai/pagination";

/** Explicit projection: no roster, teacher or guardian fields. */
export async function listAiCourses(cursor?:string){
 const page=aiListPage(cursor),pageSize=50,where={deletedAt:null};
 const [rows,total]=await Promise.all([
  getDb().course.findMany({where,select:{id:true,code:true,title:true,status:true},orderBy:[{startDate:"desc"},{id:"asc"}],skip:(page-1)*pageSize,take:pageSize}),
  getDb().course.count({where}),
 ]);
 return {...aiPageInfo(page,pageSize,total),items:rows.map(row=>({id:row.id,course:`${row.code} · ${row.title}`,status:row.status}))};
}
