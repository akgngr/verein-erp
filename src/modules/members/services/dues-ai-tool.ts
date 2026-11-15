import "server-only";
import {z} from "zod";
import {datasetResultSchema} from "@/shared/ai/dataset";
import {aiToolV2} from "@/shared/ai/v2";
import {can} from "@/shared/permissions/define";
import {memberPaymentsPermissions} from "../permissions";
import {describeDuesDataset,duesDatasetQuerySchema,DUES_DATASET_COLUMNS} from "./ai-dataset";

/** Worker-safe definition shared by the live registry and provider-wire integration tests. */
export function makeDuesDatasetTool(args:{name:"create_dues_dataset"|"create_dataset"}){
 const input=args.name==="create_dataset"?z.object({source:z.literal("members.dues"),query:duesDatasetQuerySchema}).strict():duesDatasetQuerySchema;
 return aiToolV2({name:args.name,operation:"read",allowed:user=>can(user.role,memberPaymentsPermissions,"view"),
  description:"Canonical create_dataset uses source=members.dues and a query object; the compatibility alias accepts direct query fields. Prepare a server-side dataset of dues using year, status (default OVERDUE) and optional minimum/maximum outstanding integer cents. Returns only a temporary datasetRef and count; no identities. Use propose_dataset_export for a file with real names.", // i18n-ignore (model-facing)
  descriptionKey:`members.ai.tools.${args.name}.description`,
  input,result:datasetResultSchema,modelOutput:datasetResultSchema,
  policy:{purpose:"dues-export",serverReads:["Member","MemberDue","MemberPayment"],modelFields:["datasetRef","count"],processing:"approved_provider"},projectForModel:result=>result,
  run:async(raw,context)=>{
   const query=duesDatasetQuerySchema.parse("query" in raw?raw.query:raw);
   const data=await describeDuesDataset(query,context.signal);
   const datasetRef=await context.createDataset({definition:query,selection:data,queryVersion:2,columns:[...DUES_DATASET_COLUMNS]});
   return {datasetRef,count:data.count};
  },
 });
}
