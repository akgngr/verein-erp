import "server-only";

import { z } from "zod";

import { defineEvent } from "@/shared/automation/define";

import { SPONSOR_STATUSES, SPONSOR_TIERS } from "./constants";

/** Yeni sponsorluk kaydı olayı. Yük yalnızca kimlik ve sınıflandırma taşır (PII yok). */
export const sponsorCreatedEvent = defineEvent({
  key: "sponsors.created",
  description: "sponsors.created",
  payloadSchema: z
    .object({
      sponsorId: z.string().min(1).max(128),
      tier: z.enum(SPONSOR_TIERS),
      status: z.enum(SPONSOR_STATUSES),
    })
    .strict(),
  variables: {
    namespace: "sponsors",
    fields: ["name", "tier", "status"],
    load: async (payload): Promise<Record<string, string | number | null>> => {
      const { getDb } = await import("@/shared/db");
      const record = await getDb().sponsor.findUnique({
        where: { id: payload.sponsorId },
        select: { name: true, tier: true, status: true },
      });
      return record ? { name: record.name, tier: record.tier, status: record.status } : {};
    },
  },
});
