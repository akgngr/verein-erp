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
    // SMTP ayarları mail modülündedir; burada ek ayar yok.
    isConfigured: () => isMailConfigured(),
    sendBatch: (messages) => sendMailBatch(messages.map((message) => ({
      to: message.to,
      toName: message.toName,
      subject: message.subject,
      text: message.text,
      html: message.html,
      // #581: RFC 8058 tek tıkla çıkış (Gmail/Yahoo toplu gönderici kuralları, UWG § 7).
      ...(message.unsubscribeUrl
        ? { headers: { "List-Unsubscribe": `<${message.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" as const } }
        : {}),
      context: { module: "mailings", reference: message.reference },
    }))),
    delivered: (reference) => listSuccessfulMailRecipients("mailings", reference),
  },
]);
