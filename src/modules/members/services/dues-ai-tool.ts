import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {can} from "@/shared/permissions/define";
import {memberPaymentsPermissions} from "../permissions";
import {loadDuesDataset,duesDatasetQuerySchema,DUES_DATASET_COLUMNS} from "./ai-dataset";

/** Worker-safe definition shared by the live registry and provider-wire integration tests. */
export function makeDuesDatasetTool(args:{name:"create_dues_dataset"}){
 return aiToolV2({name:args.name,operation:"read",allowed:user=>can(user.role,memberPaymentsPermissions,"view"),
  description:"Prepare a server-side dataset of dues using year, status (default OVERDUE) and optional minimum/maximum outstanding integer cents. Returns only a temporary datasetRef and count; no identities. Use propose_dataset_export for a file with real names.", // i18n-ignore (model-facing)
  input:duesDatasetQuerySchema,result:z.object({datasetRef:z.string(),count:z.number().int()}),modelOutput:z.object({datasetRef:z.string(),count:z.number().int()}).strict(),
  policy:{purpose:"dues-export",serverReads:["Member","MemberDue","MemberPayment"],modelFields:["datasetRef","count"],processing:"approved_provider",modelDataClass:"internal"},projectForModel:result=>result,
  run:async(query,context)=>{
   const data=await loadDuesDataset(query);
   const datasetRef=await context.createDataset({definition:query,selection:{fingerprint:data.fingerprint},columns:[...DUES_DATASET_COLUMNS]});
   return {datasetRef,count:data.rows.length};
  },
 });
}
