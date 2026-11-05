import "server-only";

import { z } from "zod";

import { defineEvent, defineTask } from "@/shared/automation/define";

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

/** Kampanya tamamlandı. Yük yalnızca sayılar ve kampanya kimliği taşır. */
export const campaignFinishedEvent = defineEvent({
  key: "mailings.campaign_finished",
  description: "mailings.campaign_finished",
  payloadSchema: z.object({
    campaignId: z.string().min(1).max(128),
    sent: z.number().int().min(0),
    failed: z.number().int().min(0),
  }).strict(),
});
