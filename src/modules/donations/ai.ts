import "server-only";
import {aiToolV2,defineModuleAiV2} from "@/shared/ai/v2";

import {z} from "zod";
import { euros, yearSchema } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { donationsPermissions } from "./permissions";
import { getDonationStats } from "./server";

/** Bağışlar: yalnızca istatistik; bağışçı verisi dönmez. Sözleşme: src/shared/ai/define.ts. */
const output=z.object({year:z.number().int(),totalEur:z.number(),count:z.number().int(),unconfirmedOver300:z.number().int(),confirmationsIssued:z.number().int(),confirmationWarnings:z.number().int()}).strict();

export const ai = defineModuleAiV2({
  module: "donations",
  tools: [
    aiToolV2({
      name: "get_donation_statistics",
      operation: "read",
      allowed: (user) => can(user.role, donationsPermissions, "view"),
      description: "Donation statistics for a year: total (EUR), number of donations, confirmations issued and pending. No donor data.", // i18n-ignore (model-facing tool text)
      input:yearSchema,result:output,modelOutput:output,
      policy:{"purpose": "donations-statistics", "serverReads": ["Donation"], "modelFields": ["year", "totalEur", "count", "unconfirmedOver300", "confirmationsIssued", "confirmationWarnings"], "processing": "approved_provider"},projectForModel:result=>result,
      run: async ({ year }) => {
        const stats = await getDonationStats(year);
        return { year, totalEur: euros(stats.totalCents), count: stats.count, unconfirmedOver300: stats.unconfirmedOver300Count, confirmationsIssued: stats.issuedConfirmationCount, confirmationWarnings: stats.warningConfirmationCount };
      },
    }),
  ],
  actions: {},
});
