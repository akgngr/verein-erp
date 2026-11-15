import "server-only";
import { createHash } from "node:crypto";
import { parseListParams } from "@/shared/list-params";
import { memberPaymentsPermissions } from "../permissions";
import { listDuesForExport, DUES_SORTABLE_FIELDS,DUES_DEFAULT_SORT } from "../queries/list-dues";
import { parseDuesDatasetQuery, matchesDuesDatasetAmount, duesDatasetQuerySchema } from "./dues-dataset-query";
export { memberPaymentsPermissions, duesDatasetQuerySchema, parseDuesDatasetQuery };
export const DUES_DATASET_COLUMNS=["member.fullName","dues.year","dues.overdueAmount"] as const;
export async function loadDuesDataset(input:unknown) {
 const query=parseDuesDatasetQuery(typeof input==="number"?{year:input}:input);
 const {year}=query;
 const params=parseListParams({pageSize:"50","filter.status":query.status=== "ALL"?"":query.status??"OVERDUE"},{sortableFields:DUES_SORTABLE_FIELDS,defaultSort:DUES_DEFAULT_SORT,filterKeys:["status","type","year"]});
 const candidates=await listDuesForExport(params,year,5001);
 if(candidates.length>5000)throw new Error("AI_DATASET_ROW_LIMIT");
 const rows=candidates.filter(row=>matchesDuesDatasetAmount(row.remainingCents,query));
 rows.sort((a,b)=>a.id.localeCompare(b.id));
 const fingerprint=createHash("sha256").update(JSON.stringify(rows)).digest("hex");
 return {rows,fingerprint};
}
