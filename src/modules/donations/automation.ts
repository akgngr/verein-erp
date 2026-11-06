import "server-only";

import { z } from "zod";

import { defineEvent } from "@/shared/automation/define";

/** Yeni bağış kaydı. Bağışçı bilgisi yükte yer almaz; gerekirse gönderim anında okunur. */
export const donationReceivedEvent = defineEvent({
  key: "donations.received",
  description: "donations.received",
  payloadSchema: z.object({
    donationId: z.string().min(1).max(128),
    method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "PAYPAL", "REIMBURSEMENT_WAIVER", "OTHER"]),
    amount: z.number().nonnegative(),
  }).strict(),
  variables: {
    namespace: "donation",
    fields: ["donationNumber", "amount", "receivedAt", "donorName", "purposeNote"],
    load: async (payload): Promise<Record<string, string | number | null>> => {
      const { getDb } = await import("@/shared/db");
      const donation = await getDb().donation.findUnique({
        where: { id: payload.donationId },
        select: { donationNumber: true, amount: true, receivedAt: true, purposeNote: true, donor: { select: { firstName: true, lastName: true, organizationName: true } } },
      });
      if (!donation) return {};
      return {
        donationNumber: donation.donationNumber,
        amount: donation.amount.toFixed(2),
        receivedAt: donation.receivedAt.toISOString().slice(0, 10),
        donorName: donation.donor.organizationName ?? ([donation.donor.firstName, donation.donor.lastName].filter(Boolean).join(" ") || null),
        purposeNote: donation.purposeNote ?? null,
      };
    },
  },
});
