import "server-only";
import { automationTrace, maskEmail } from "@/shared/automation/trace";

import { z } from "zod";

import { defineEvent, defineTask, PermanentTaskError } from "@/shared/automation/define";

/**
 * S4.1 (#313): gelen kutusuna yeni e-posta kaydedildi. Yalnız kimlik ve sayılar; gönderen, konu,
 * gövde veya ek adı YOK. Sınıf yalnız kurum düzeyinde sınıflama açıksa dolu.
 */
export const mailMessageReceivedEvent = defineEvent({
  key: "mail.message_received",
  description: "mail.message_received",
  payloadSchema: z.object({
    inboxMessageId: z.string().min(1).max(64),
    source: z.enum(["IMAP", "EML"]),
    attachmentCount: z.number().int().min(0).max(100),
    category: z.enum(["invoice", "meeting", "membership", "donation", "question", "other"]).nullable(),
  }).strict(),
});

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
    // A fixed address, or a record reference resolved at send time (e.g. {{member.email}}).
    to: z.string().trim().max(254).refine(
      (value) => z.string().email().safeParse(value).success || /^\{\{\s*[a-z]+\.[A-Za-z0-9_]+\s*\}\}$/.test(value),
      "MAIL_RECIPIENT_INVALID",
    ),
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
    // Fill {{member.fullName}}-style fields in memory only (never stored).
    const { renderWorkflowVariables } = await import("@/shared/automation/variables");
    const text = await renderWorkflowVariables(context.executionId, { to: input.to, subject: input.subject, body: input.body });
    if (!z.string().email().safeParse(text.to.trim()).success) {
      automationTrace("mail", "recipient is not a valid address after rendering", { execution: context.executionId, to: text.to.startsWith("{{") ? text.to : maskEmail(text.to) });
      throw new PermanentTaskError("MAIL_RECIPIENT_INVALID");
    }
    automationTrace("mail", "sending", { execution: context.executionId, to: maskEmail(text.to) });
    const result = await sendMail({
      to: text.to.trim(),
      subject: text.subject,
      text: text.body,
      context: { module: "automation", reference: context.executionId },
    });
    // SMTP details are in the mail log (E-Mail → Protokoll); keep the code generic here.
    automationTrace("mail", result.ok ? "sent" : "send failed", {
      execution: context.executionId,
      to: maskEmail(text.to),
      ...(result.ok ? { messageId: result.messageId } : { smtpError: result.error.slice(0, 300) }),
      mailLog: result.logId,
    });
    if (!result.ok) throw new Error("MAIL_SEND_FAILED");
    return { sent: true };
  },
});

/**
 * Scheduled IMAP inbox polling task (`mail.fetch_inbox`).
 * Safely no-ops when IMAP settings are not configured; otherwise fetches new messages
 * read-only via `fetchImap()` and emits `mail.message_received` per newly stored email.
 */
export const fetchInboxTask = defineTask({
  key: "mail.fetch_inbox",
  version: 1,
  description: "mail.fetch_inbox",
  inputSchema: z.object({}).strict(),
  timeoutSeconds: 180,
  retry: { maxAttempts: 2 },
  schedule: {
    input: () => ({}),
    minIntervalMinutes: 15,
    automaticIntervalMinutes: 15,
  },
  handler: async () => {
    const { runScheduledImapFetch } = await import("./services/inbox");
    return runScheduledImapFetch();
  },
});
