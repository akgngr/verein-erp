import "server-only";

import { z } from "zod";

import { defineEvent } from "@/shared/automation/define";

/** Evrak kayda alındı (gelen/giden). Konu ve karşı taraf yalnızca gönderim anında okunur. */
export const documentRegisteredEvent = defineEvent({
  key: "documents.registered",
  description: "documents.registered",
  payloadSchema: z.object({
    documentId: z.string().min(1).max(128),
    direction: z.enum(["INCOMING", "OUTGOING"]),
    hasDueDate: z.boolean(),
  }).strict(),
  variables: {
    namespace: "document",
    fields: ["registryNumber", "subject", "counterparty", "documentDate", "dueDate"],
    load: async (payload): Promise<Record<string, string | number | null>> => {
      const { getDb } = await import("@/shared/db");
      const doc = await getDb().document.findUnique({
        where: { id: payload.documentId },
        select: { registryNumber: true, subject: true, counterparty: true, documentDate: true, dueDate: true },
      });
      if (!doc) return {};
      return {
        registryNumber: doc.registryNumber,
        subject: doc.subject,
        counterparty: doc.counterparty,
        documentDate: doc.documentDate.toISOString().slice(0, 10),
        dueDate: doc.dueDate ? doc.dueDate.toISOString().slice(0, 10) : null,
      };
    },
  },
});
