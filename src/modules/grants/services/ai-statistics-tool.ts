import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {can} from "@/shared/permissions/define";
import {grantsPermissions} from "../permissions";
import {grantStats} from "../queries/ai-stats";

const get_grant_overviewOutput=z.object({byStatus:z.object({PLANNED:z.number().int().nonnegative(),APPLIED:z.number().int().nonnegative(),APPROVED:z.number().int().nonnegative(),ACTIVE:z.number().int().nonnegative(),REPORTED:z.number().int().nonnegative(),CLOSED:z.number().int().nonnegative(),REJECTED:z.number().int().nonnegative()}).strict(),approvedTotal:z.number(),reportsOverdue:z.number().int().nonnegative(),reportsDueIn30Days:z.number().int().nonnegative()}).strict();

export const aiStatisticsTool=aiToolV2({
      name: "get_grant_overview",
      operation: "read",
      allowed: (user) => can(user.role, grantsPermissions, "view"),
      description: "Grant overview: number of grants per status, total approved amount (EUR), overdue reports and reports due within 30 days. No booking details.", // i18n-ignore (model-facing tool text)
      input:(z.object({})).strict(),
      result:get_grant_overviewOutput,modelOutput:get_grant_overviewOutput,
      policy:{"purpose":"grants-statistics","serverReads":["Grant"],"modelFields":["byStatus.PLANNED","byStatus.APPLIED","byStatus.APPROVED","byStatus.ACTIVE","byStatus.REPORTED","byStatus.CLOSED","byStatus.REJECTED","approvedTotal","reportsOverdue","reportsDueIn30Days"],"processing":"approved_provider","modelDataClass":"aggregate"},projectForModel:result=>result,
      run: async () => {
        const stats=await grantStats();
        return {...stats,byStatus:{PLANNED:stats.byStatus.PLANNED,APPLIED:stats.byStatus.APPLIED,APPROVED:stats.byStatus.APPROVED,ACTIVE:stats.byStatus.ACTIVE,REPORTED:stats.byStatus.REPORTED,CLOSED:stats.byStatus.CLOSED,REJECTED:stats.byStatus.REJECTED}};
      },
    });
