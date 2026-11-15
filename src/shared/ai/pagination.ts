import { z } from "zod";

/** A bounded ordinal cursor for legacy live lists (not a snapshot identifier). */
export const aiListCursor = z.string().regex(/^[1-9]\d{0,3}$/).optional();
export function aiListPage(cursor?:string):number {
 return cursor ? Number(aiListCursor.parse(cursor)) : 1;
}
export function aiPageInfo(page:number,pageSize:number,total:number){
 const hasMore=page*pageSize<total;
 return {page,pageSize,total,hasMore,nextCursor:hasMore&&page<9999?String(page+1):null,completeness:page===1&&!hasMore?"complete":"partial"};
}
