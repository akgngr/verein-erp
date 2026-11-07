import "server-only";

import { z } from "zod";

import { defineEvent } from "@/shared/automation/define";

const STAGE = z.enum(["OPEN", "PROPOSAL", "WON", "LOST"]);

/** Fırsat aşaması değişti (ör. kazanıldı → teşekkür e-postası iş akışı). Kişi bilgisi taşımaz. */
export const crmDealStageChangedEvent = defineEvent({
  key: "crm.deal_stage_changed",
  description: "crm.deal_stage_changed",
  payloadSchema: z.object({ dealId: z.string().min(1).max(64), from: STAGE, to: STAGE }).strict(),
  variables: {
    namespace: "deal",
    fields: ["title", "amount"],
    load: async (payload): Promise<Record<string, string | number | null>> => {
      const { getDb } = await import("@/shared/db");
      const deal = await getDb().crmDeal.findUnique({ where: { id: payload.dealId }, select: { title: true, amountCents: true } });
      return deal ? { title: deal.title, amount: deal.amountCents === null ? null : deal.amountCents / 100 } : {};
    },
  },
});
