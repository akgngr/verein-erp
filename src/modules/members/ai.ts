import "server-only";
import {aiStatisticsTool} from "./services/ai-statistics-tool";
import {z} from "zod";
import {aiToolV2,defineModuleAiV2} from "@/shared/ai/v2";
import {makeDuesDatasetTool} from "./services/dues-ai-tool";

import { can } from "@/shared/permissions/define";

import { memberPaymentsPermissions } from "./permissions";
import { describeDuesDataset, parseDuesDatasetQuery, duesDatasetQuerySchema, DUES_DATASET_COLUMNS } from "./server";

/** Üyeler: yalnızca sayılar; üye adı veya ayrıntısı dönmez. Sözleşme: src/shared/ai/define.ts. */

export const ai = defineModuleAiV2({
  module: "members",
  tools: [
    makeDuesDatasetTool({name:"create_dataset"}),
    makeDuesDatasetTool({name:"create_dues_dataset"}),
    aiToolV2({name:"query_dataset",descriptionKey:"members.ai.tools.query_dataset.description",operation:"read",allowed:user=>can(user.role,memberPaymentsPermissions,"view"),
      description:"Refine a members dues dataset using an existing datasetRef and allowed status or integer-cent amount filters. Creates a fresh scoped reference and returns only a count. No personal identities or arbitrary SQL.", // i18n-ignore (model-facing)
      input:duesDatasetQuerySchema.omit({year:true}).extend({datasetRef:z.string().regex(/^[A-Za-z0-9_-]{43}$/)}).strict(),
      result:z.object({datasetRef:z.string(),count:z.number().int()}),modelOutput:z.object({datasetRef:z.string(),count:z.number().int()}).strict(),
      policy:{purpose:"dues-export",serverReads:["Member","MemberDue","MemberPayment"],modelFields:["datasetRef","count"],processing:"approved_provider"},projectForModel:result=>result,
      run:async({datasetRef,...filters},context)=>{
        const original=parseDuesDatasetQuery(await context.loadDatasetDefinition(datasetRef));
        const query=parseDuesDatasetQuery({...original,...filters}),data=await describeDuesDataset(query,context.signal);
        const next=await context.createDataset({definition:query,selection:data,queryVersion:2,columns:[...DUES_DATASET_COLUMNS]});
        return {datasetRef:next,count:data.count};
      },
    }),
    aiStatisticsTool,
  ],
  actions: {},
});
