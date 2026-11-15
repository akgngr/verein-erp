import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {can} from "@/shared/permissions/define";
import {crmPermissions} from "../permissions";
import {dealStageTotals} from "../queries/ai-stats";

const get_crm_pipelineOutput=z.object({deals:z.object({OPEN:z.object({count:z.number().int().nonnegative(),amount:z.number()}).strict().optional(),PROPOSAL:z.object({count:z.number().int().nonnegative(),amount:z.number()}).strict().optional(),WON:z.object({count:z.number().int().nonnegative(),amount:z.number()}).strict().optional(),LOST:z.object({count:z.number().int().nonnegative(),amount:z.number()}).strict().optional()}).strict()}).strict();

export const aiStatisticsTool=aiToolV2({
      name: "get_crm_pipeline",
      operation: "read",
      allowed: (user) => can(user.role, crmPermissions, "view"),
      description: "CRM pipeline totals: deal count and amount (EUR) per stage (OPEN, PROPOSAL, WON, LOST), No titles, names or notes.", // i18n-ignore (model-facing tool text)
      input:(z.object({})).strict(),
      result:get_crm_pipelineOutput,modelOutput:get_crm_pipelineOutput,
      policy:{"purpose":"crm-statistics","serverReads":["CrmDeal"],"modelFields":["deals.OPEN.count","deals.OPEN.amount","deals.PROPOSAL.count","deals.PROPOSAL.amount","deals.WON.count","deals.WON.amount","deals.LOST.count","deals.LOST.amount"],"processing":"approved_provider","modelDataClass":"aggregate"},projectForModel:result=>result,
      run: async () => ({ deals: await dealStageTotals() }),
    });
