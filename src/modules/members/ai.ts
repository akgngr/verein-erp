import "server-only";

import { YEAR_INPUT, aiTool, defineModuleAi, euros, yearSchema } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { membersPermissions } from "./permissions";
import { getDuesStats, getMemberStats } from "./server";

/** Üyeler: yalnızca sayılar; üye adı veya ayrıntısı dönmez. Sözleşme: src/shared/ai/define.ts. */
export const ai = defineModuleAi({
  module: "members",
  tools: [
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
