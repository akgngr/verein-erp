import "server-only";
import { createHash } from "node:crypto";
import { parseListParams } from "@/shared/list-params";
import { memberPaymentsPermissions } from "../permissions";
import { listDuesForExport, DUES_SORTABLE_FIELDS,DUES_DEFAULT_SORT } from "../queries/list-dues";
export { memberPaymentsPermissions };
export const DUES_DATASET_COLUMNS=["member.fullName","dues.year","dues.overdueAmount"] as const;
export async function loadDuesDataset(year:number) {
 const params=parseListParams({pageSize:"50",status:"OVERDUE"},{sortableFields:DUES_SORTABLE_FIELDS,defaultSort:DUES_DEFAULT_SORT,filterKeys:["status","type","year"]});
 const rows=await listDuesForExport(params,year,5001);
 if(rows.length>5000)throw new Error("AI_DATASET_ROW_LIMIT");
 rows.sort((a,b)=>a.id.localeCompare(b.id));
 const fingerprint=createHash("sha256").update(JSON.stringify(rows)).digest("hex");
 return {rows,fingerprint};
}
