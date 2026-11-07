import "server-only";

import { isMailConfigured, listSuccessfulMailRecipients, sendMailBatch } from "@/modules/mail/automation";
import { defineChannels } from "@/shared/campaigns/channel";

/** Yerleşik e-posta kanalı (mail modülü SMTP). İtiraz edenler (`optOut`) atlanır. */
export const channels = defineChannels("mailings", [
  {
    key: "email",
    icon: "Mail",
    capabilities: { subject: true, html: true },
    address: (recipient) => recipient.email?.trim() || null,
    allowed: (recipient) => !recipient.optOut,
    isConfigured: () => isMailConfigured(),
    sendBatch: (messages) => sendMailBatch(messages.map((message) => ({
      to: message.to,
      toName: message.toName,
      subject: message.subject,
      text: message.text,
      html: message.html,
      context: { module: "mailings", reference: message.reference },
    }))),
    delivered: (reference) => listSuccessfulMailRecipients("mailings", reference),
  },
]);
