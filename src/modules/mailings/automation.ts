import { z } from "zod";

import { defineTask } from "@/shared/automation/define";

/** Queue payload stores only the campaign ID; recipient data stays in the source module. */
export const sendCampaignTask = defineTask({
  key: "mailings.send_campaign",
  version: 1,
  description: "mailings.send_campaign",
  inputSchema: z.object({ campaignId: z.string().min(1).max(128) }).strict(),
  timeoutSeconds: 60 * 60,
  retry: {
    maxAttempts: 3,
    initialDelaySeconds: 30,
    maxDelaySeconds: 15 * 60,
    backoffMultiplier: 2,
  },
  idempotencyKey: (input) => `mailings:campaign:${input.campaignId}`,
  handler: async (input, context) => {
    const { processCampaign } = await import("./services/campaigns");
    return processCampaign(input.campaignId, context);
  },
});
