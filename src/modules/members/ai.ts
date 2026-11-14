import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";

import { YEAR_INPUT, aiTool, defineModuleAi, euros, yearSchema } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { memberPaymentsPermissions } from "./permissions";
import { membersPermissions } from "./permissions";
import { loadDuesDataset, DUES_DATASET_COLUMNS, getDuesStats, getMemberStats } from "./server";

/** Üyeler: yalnızca sayılar; üye adı veya ayrıntısı dönmez. Sözleşme: src/shared/ai/define.ts. */
export const ai = defineModuleAi({
  module: "members",
  tools: [
    aiToolV2({name:"create_dues_dataset",operation:"read",allowed:user=>can(user.role,memberPaymentsPermissions,"view"),
      description:"Prepare a server-side dataset of overdue dues. Returns only a temporary datasetRef and count; no identities. Use propose_dataset_export for a file with real names.", // i18n-ignore (model-facing)
      input:yearSchema,result:z.object({datasetRef:z.string(),count:z.number().int()}),modelOutput:z.object({datasetRef:z.string(),count:z.number().int()}).strict(),
      policy:{purpose:"dues-export",serverReads:["Member","MemberDue","MemberPayment"],modelFields:["datasetRef","count"],processing:"approved_provider"},projectForModel:result=>result,
      run:async({year},context)=>{
        const data=await loadDuesDataset(year);
        const datasetRef=await context.createDataset({definition:{year},selection:{fingerprint:data.fingerprint},columns:[...DUES_DATASET_COLUMNS]});
        return {datasetRef,count:data.rows.length};
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
