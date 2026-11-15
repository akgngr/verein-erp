import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {makeDuesDatasetTool} from "./services/dues-ai-tool";

import { YEAR_INPUT, aiTool, defineModuleAi, euros, yearSchema } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { memberPaymentsPermissions } from "./permissions";
import { membersPermissions } from "./permissions";
import { loadDuesDataset, parseDuesDatasetQuery, duesDatasetQuerySchema, DUES_DATASET_COLUMNS, getDuesStats, getMemberStats } from "./server";

/** Üyeler: yalnızca sayılar; üye adı veya ayrıntısı dönmez. Sözleşme: src/shared/ai/define.ts. */
export const ai = defineModuleAi({
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
        const query=parseDuesDatasetQuery({...original,...filters}),data=await loadDuesDataset(query);
        const next=await context.createDataset({definition:query,selection:{fingerprint:data.fingerprint},columns:[...DUES_DATASET_COLUMNS]});
        return {datasetRef:next,count:data.rows.length};
      },
    }),
    aiTool({
      name: "get_member_statistics",
      operation: "read",
      allowed: (user) => can(user.role, membersPermissions, "view"),
      description: "Member counts by status and membership type, plus membership-fee collection statistics for a year. Numbers only; no member names or details.", // i18n-ignore (model-facing tool text)
      schema: yearSchema,
      inputSchema: YEAR_INPUT,
      run: async ({ year }) => {
        const [stats, dues] = await Promise.all([getMemberStats(), getDuesStats(year)]);
        return {
          members: stats,
          dues: {
            year: dues.year,
            expectedEur: euros(dues.expectedCents),
            collectedEur: euros(dues.collectedCents),
            remainingEur: euros(dues.remainingCents),
            collectionRatePercent: dues.collectionRate,
            openCount: dues.openCount,
            partialCount: dues.partialCount,
            paidCount: dues.paidCount,
            overdueCount: dues.overdueCount,
          },
        };
      },
    }),
  ],
  actions: {},
});
