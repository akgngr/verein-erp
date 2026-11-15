import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {can} from "@/shared/permissions/define";
import {membersPermissions} from "../permissions";
import {getMemberStats} from "../queries/get-member-stats";
import {getDuesStats} from "../queries/get-dues-stats";
import {euros,yearSchema} from "@/shared/ai/define";

const get_member_statisticsOutput=z.object({members:z.object({active:z.number().int().nonnegative(),passive:z.number().int().nonnegative(),resigned:z.number().int().nonnegative(),newThisMonth:z.number().int().nonnegative(),byType:z.array(z.object({type:z.enum(['ASIL','ONURSAL','FAHRI','DESTEKCI']),count:z.number().int().nonnegative()}).strict()).max(4)}).strict(),dues:z.object({year:z.number().int(),expectedEur:z.number(),collectedEur:z.number(),remainingEur:z.number(),collectionRatePercent:z.number().nullable(),openCount:z.number().int().nonnegative(),partialCount:z.number().int().nonnegative(),paidCount:z.number().int().nonnegative(),overdueCount:z.number().int().nonnegative()}).strict()}).strict();

export const aiStatisticsTool=aiToolV2({
      name: "get_member_statistics",
      operation: "read",
      allowed: (user) => can(user.role, membersPermissions, "view"),
      description: "Member counts by status and membership type, plus membership-fee collection statistics for a year. Numbers only; no member names or details.", // i18n-ignore (model-facing tool text)
      input:(yearSchema).strict(),
      result:get_member_statisticsOutput,modelOutput:get_member_statisticsOutput,
      policy:{"purpose":"members-statistics","serverReads":["Member","MemberDue","MemberPayment"],"modelFields":["members.active","members.passive","members.resigned","members.newThisMonth","members.byType.type","members.byType.count","dues.year","dues.expectedEur","dues.collectedEur","dues.remainingEur","dues.collectionRatePercent","dues.openCount","dues.partialCount","dues.paidCount","dues.overdueCount"],"processing":"approved_provider","modelDataClass":"aggregate"},projectForModel:result=>result,
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
    });
