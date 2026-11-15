import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {datasetRefSchema,proposalAcknowledgementSchema} from "@/shared/ai/dataset";
import {PROPOSED} from "@/shared/ai/define";
import {can} from "@/shared/permissions/define";
import {DUES_DATASET_COLUMNS} from "@/modules/members/automation";
import {exportsPermissions} from "../permissions";

export const datasetExportPlanSchema=z.object({datasetRef:datasetRefSchema,format:z.enum(["csv","xlsx"]),columns:z.array(z.enum(DUES_DATASET_COLUMNS)).min(1).max(3)}).strict();
export function makeDatasetExportTool(args:{name:"export_dataset"|"propose_dataset_export"}){
 return aiToolV2({name:args.name,operation:"create",allowed:user=>can(user.role,exportsPermissions,"create"),
  description:"Prepare an export confirmation for a server-side datasetRef. This does not generate a file until the user confirms. Formats CSV/XLSX; columns member.fullName, dues.year, dues.overdueAmount. Real names are inserted only by the server worker.", // i18n-ignore (model-facing)
  descriptionKey:`exports.ai.tools.${args.name}.description`,
  input:datasetExportPlanSchema,result:proposalAcknowledgementSchema,modelOutput:proposalAcknowledgementSchema,
  policy:{purpose:"dataset-export",serverReads:[],modelFields:["status","note"],processing:"approved_provider",modelDataClass:"internal"},projectForModel:result=>result,
  run:async(input,{propose})=>{propose({action:"datasetExport",title:input.format,details:input.columns,payload:input});return PROPOSED;},
 });
}
