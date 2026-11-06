import "server-only";
import { automationTrace, maskEmail } from "@/shared/automation/trace";

import { z } from "zod";

import { defineTask, PermanentTaskError } from "@/shared/automation/define";

// mail modülü — worker/otomasyonlar için framework bağımsız sunucu API'si.
// Next.js action, route veya UI modüllerini bu girişe eklemeyin.
export { sendMail, sendMailBatch, isMailConfigured, listSuccessfulMailRecipients } from "./services/mail-service";

/**
 * Workflow node: send one notification e-mail to a fixed address chosen by the
 * workflow author (e.g. the board inbox). Not for bulk mail to members — use the
 * mailings module for that.
 */
export const sendNotificationTask = defineTask({
  key: "mail.send_notification",
  version: 1,
  description: "mail.send_notification",
  inputSchema: z.object({
    to: z.string().trim().email().max(254),
    subject: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(5000),
  }).strict(),
  timeoutSeconds: 120,
  retry: { maxAttempts: 3, initialDelaySeconds: 60, maxDelaySeconds: 15 * 60, backoffMultiplier: 2 },
  workflow: { defaultInput: { to: "", subject: "", body: "" } },
  handler: async (input, context) => {
    const { sendMail, isMailConfigured } = await import("./services/mail-service");
    if (!(await isMailConfigured())) {
      automationTrace("mail", "not configured (Settings → E-Mail)", { execution: context.executionId });
      throw new PermanentTaskError("MAIL_NOT_CONFIGURED");
    }
    automationTrace("mail", "sending", { execution: context.executionId, to: maskEmail(input.to) });
    const result = await sendMail({
      to: input.to,
      subject: input.subject,
      text: input.body,
      context: { module: "automation", reference: context.executionId },
    });
    // SMTP details are in the mail log (E-Mail → Protokoll); keep the code generic here.
    automationTrace("mail", result.ok ? "sent" : "send failed", {
      execution: context.executionId,
      to: maskEmail(input.to),
      ...(result.ok ? { messageId: result.messageId } : { smtpError: result.error.slice(0, 300) }),
      mailLog: result.logId,
    });
    if (!result.ok) throw new Error("MAIL_SEND_FAILED");
    return { sent: true };
  },
});
