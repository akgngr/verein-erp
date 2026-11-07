import "server-only";

import { z } from "zod";

import { defineEvent, defineTask } from "@/shared/automation/define";

/** Online form imzalandı (ör. sekreterliğe bildirim). Kişi bilgisi taşımaz. */
export const onlineFormCompletedEvent = defineEvent({
  key: "online-forms.completed",
  description: "online-forms.completed",
  payloadSchema: z.object({ requestId: z.string().min(1).max(64), kind: z.enum(["MEMBER", "STUDENT", "GUARDIAN"]) }).strict(),
});

/** İmzalı form PDF'ini arka planda üretip şifreli saklar. Yük yalnız istek kimliği taşır. */
export const renderSignedPdfTask = defineTask({
  key: "online-forms.render_pdf",
  version: 1,
  description: "online-forms.render_pdf",
  inputSchema: z.object({ requestId: z.string().min(1).max(64) }).strict(),
  timeoutSeconds: 120,
  retry: { maxAttempts: 5, initialDelaySeconds: 10, maxDelaySeconds: 10 * 60, backoffMultiplier: 2 },
  idempotencyKey: (input) => `online-forms:pdf:${input.requestId}`,
  handler: async (input) => {
    const { storeEvidencePdfInWorker } = await import("./services/evidence-pdf-input");
    await storeEvidencePdfInWorker(input.requestId);
    return { stored: true };
  },
});
