import "server-only";
import { createHash } from "node:crypto";
import { parseListParams } from "@/shared/list-params";
import { memberPaymentsPermissions } from "../permissions";
import { iterateDuesForDataset, DUES_SORTABLE_FIELDS,DUES_DEFAULT_SORT } from "../queries/list-dues";
import { parseDuesDatasetQuery, matchesDuesDatasetAmount, duesDatasetQuerySchema } from "./dues-dataset-query";
export { memberPaymentsPermissions, duesDatasetQuerySchema, parseDuesDatasetQuery };
export const DUES_DATASET_COLUMNS=["member.fullName","dues.year","dues.overdueAmount"] as const;
export async function loadDuesDataset(input:unknown) {
 const query=parseDuesDatasetQuery(typeof input==="number"?{year:input}:input);
 const {year}=query;
 const params=parseListParams({pageSize:"50","filter.status":query.status=== "ALL"?"":query.status??"OVERDUE"},{sortableFields:DUES_SORTABLE_FIELDS,defaultSort:DUES_DEFAULT_SORT,filterKeys:["status","type","year"]});
 const candidates=[];
 for await(const row of iterateDuesForDataset(params,year,{signal:AbortSignal.timeout(30000),maxCandidates:5000}))candidates.push(row);
 const rows=candidates.filter(row=>matchesDuesDatasetAmount(row.remainingCents,query));
 rows.sort((a,b)=>a.id.localeCompare(b.id));
 const fingerprint=createHash("sha256").update(JSON.stringify(rows)).digest("hex");
 return {rows,fingerprint};
}


/** Version 2 snapshots hash rows in PostgreSQL keyset order, without materializing the selection. */
export async function* streamDuesDataset(input:unknown,options:{signal:AbortSignal;beforeBatch?:()=>Promise<void>}) {
 const query=parseDuesDatasetQuery(input);
 const params=parseListParams({"filter.status":query.status==="ALL"?"":query.status??"OVERDUE"},{sortableFields:DUES_SORTABLE_FIELDS,defaultSort:DUES_DEFAULT_SORT,filterKeys:["status","type","year"]});
 for await(const row of iterateDuesForDataset(params,query.year,options))if(matchesDuesDatasetAmount(row.remainingCents,query))yield row;
}
export function duesSnapshotHasher(){
 const hash=createHash("sha256").update("members.dues:v2:[");let count=0;
 return {add(row:unknown){hash.update(count++?",":"").update(JSON.stringify(row));},finish(){return {count,fingerprint:hash.update("]").digest("hex")};}};
}
export async function describeDuesDataset(input:unknown,signal:AbortSignal=AbortSignal.timeout(30000)){
 const hash=duesSnapshotHasher();
 for await(const row of streamDuesDataset(input,{signal}))hash.add(row);
 return hash.finish();
}
