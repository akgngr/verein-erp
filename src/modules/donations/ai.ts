import "server-only";

import { YEAR_INPUT, aiTool, defineModuleAi, euros, yearSchema } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { donationsPermissions } from "./permissions";
import { getDonationStats } from "./server";

/** Bağışlar: yalnızca istatistik; bağışçı verisi dönmez. Sözleşme: src/shared/ai/define.ts. */
export const ai = defineModuleAi({
  module: "donations",
  tools: [
    aiTool({
      name: "get_donation_statistics",
      operation: "read",
      allowed: (user) => can(user.role, donationsPermissions, "view"),
      description: "Donation statistics for a year: total (EUR), number of donations, confirmations issued and pending. No donor data.", // i18n-ignore (model-facing tool text)
      schema: yearSchema,
      inputSchema: YEAR_INPUT,
      run: async ({ year }) => {
        const stats = await getDonationStats(year);
        return { year, totalEur: euros(stats.totalCents), count: stats.count, unconfirmedOver300: stats.unconfirmedOver300Count, confirmationsIssued: stats.issuedConfirmationCount, confirmationWarnings: stats.warningConfirmationCount };
      },
    }),
  ],
  actions: {},
});
