import "server-only";

import { z } from "zod";

import { aiTool, defineModuleAi } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { crmPermissions } from "./permissions";
import { dealStageTotals } from "./services/crm";

/** CRM: yalnız toplu sayılar; kişi adı, iletişim, not ve zaman akışı verilmez. */
export const ai = defineModuleAi({
  module: "crm",
  tools: [
    aiTool({
      name: "get_crm_pipeline",
      operation: "read",
      allowed: (user) => can(user.role, crmPermissions, "view"),
      description: "CRM pipeline totals: deal count and amount (EUR) per stage (OPEN, PROPOSAL, WON, LOST), No titles, names or notes.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      run: async () => ({ deals: await dealStageTotals() }),
    }),
  ],
  actions: {},
});
