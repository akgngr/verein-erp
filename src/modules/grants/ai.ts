import "server-only";

import { z } from "zod";

import { aiTool, defineModuleAi } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { grantsPermissions } from "./permissions";
import { grantStats } from "./services/grants";

/** Hibeler: yalnız toplu sayılar (fiş, karşı taraf ve rapor metni verilmez). */
export const ai = defineModuleAi({
  module: "grants",
  tools: [
    aiTool({
      name: "get_grant_overview",
      operation: "read",
      allowed: (user) => can(user.role, grantsPermissions, "view"),
      description: "Grant overview: number of grants per status, total approved amount (EUR), overdue reports and reports due within 30 days. No booking details.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      run: async () => grantStats(),
    }),
  ],
  actions: {},
});
