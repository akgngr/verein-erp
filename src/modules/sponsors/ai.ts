import "server-only";

import { z } from "zod";

import { euros } from "@/shared/ai/define";
import { aiToolV2, defineModuleAiV2 } from "@/shared/ai/v2";
import { can } from "@/shared/permissions/define";

import { sponsorsPermissions } from "./permissions";
import { getSponsorSummary } from "./queries/list-sponsors";

/** Sponsorlar: yalnızca toplu sayılar ve aktif taahhüt toplamı (kişisel/iletişim verisi dönmez). */
const sponsorStatsOutput = z
  .object({
    totalCount: z.number().int().nonnegative(),
    activeCount: z.number().int().nonnegative(),
    activeAmountEur: z.number().nonnegative(),
    leadCount: z.number().int().nonnegative(),
  })
  .strict();

export const ai = defineModuleAiV2({
  module: "sponsors",
  tools: [
    aiToolV2({
      name: "get_sponsor_statistics",
      operation: "read",
      allowed: (user) => can(user.role, sponsorsPermissions, "view"),
      description:
        "Sponsor aggregate statistics: total sponsors, active sponsors, active annual commitment total (EUR), and leads. Counts and totals only; no sponsor names or contacts.", // i18n-ignore (model-facing tool text)
      input: z.object({}).strict(),
      result: sponsorStatsOutput,
      modelOutput: sponsorStatsOutput,
      policy: {
        purpose: "sponsors-statistics",
        serverReads: ["Sponsor"],
        modelFields: ["totalCount", "activeCount", "activeAmountEur", "leadCount"],
        processing: "approved_provider",
        modelDataClass: "aggregate",
      },
      projectForModel: (result) => result,
      run: async () => {
        const stats = await getSponsorSummary();
        return {
          totalCount: stats.totalCount,
          activeCount: stats.activeCount,
          activeAmountEur: euros(stats.activeAmountCents),
          leadCount: stats.leadCount,
        };
      },
    }),
  ],
  actions: {},
});
