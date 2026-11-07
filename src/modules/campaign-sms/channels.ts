import "server-only";

import { channelFetch, defineChannels, normalizePhone, type ChannelConfig, type ChannelMessage, type ChannelSendResult } from "@/shared/campaigns/channel";

/**
 * SMS kanalı. Sağlayıcı yönetici ayarından seçilir: seven.io (Almanya) veya Twilio. Yalnız SMS izni
 * veren ve geçerli telefonu olan kişilere gider (UWG §7). Uzun mesajlar sağlayıcıda birleşik SMS olur.
 */
export const PROVIDERS = ["seven", "twilio"] as const;
const MAX_LENGTH = 918; // 6 × 153 (birleşik GSM-7)

async function sendSeven(message: ChannelMessage, config: ChannelConfig): Promise<ChannelSendResult> {
  const response = await channelFetch(["seven.io"], "https://gateway.seven.io/api/sms", {
    method: "POST",
    headers: { "X-Api-Key": config.apiKey ?? "", "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ to: message.to, text: message.text.slice(0, MAX_LENGTH), from: config.sender || undefined }),
  });
  if (!response.ok) return { ok: false, error: `SMS_HTTP_${response.status}` };
  const body = (await response.json().catch(() => ({}))) as { success?: string; messages?: { id?: string; success?: boolean }[] };
  const first = body.messages?.[0];
  return first?.success === false || (body.success && body.success !== "100") ? { ok: false, error: `SMS_${body.success ?? "FAILED"}` } : { ok: true, providerId: first?.id };
}

async function sendTwilio(message: ChannelMessage, config: ChannelConfig): Promise<ChannelSendResult> {
  const sid = config.accountSid ?? "";
  if (!/^AC[0-9a-f]{32}$/i.test(sid)) return { ok: false, error: "SMS_CONFIG" };
  const response = await channelFetch(["api.twilio.com"], `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${config.apiKey ?? ""}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: message.to, From: config.sender ?? "", Body: message.text.slice(0, MAX_LENGTH) }),
  });
  if (!response.ok) return { ok: false, error: `SMS_HTTP_${response.status}` };
  const body = (await response.json().catch(() => ({}))) as { sid?: string };
  return { ok: true, providerId: body.sid };
}

export const channels = defineChannels("campaign-sms", [
  {
    key: "sms",
    icon: "MessageSquare",
    capabilities: { subject: false, html: false, maxLength: MAX_LENGTH },
    settings: [
      { key: "provider", options: PROVIDERS, defaultValue: "seven" },
      { key: "apiKey", secret: true },
      { key: "accountSid" },
      { key: "sender" },
      { key: "countryCode", defaultValue: "49" },
    ],
    // Ülke kodu ayardan: "0151 …" → "+49151…".
    enrich: async (list, config) => list.map((recipient) => ({ ...recipient, phone: normalizePhone(recipient.phone, config.countryCode || "49") })),
    address: (recipient) => normalizePhone(recipient.phone),
    allowed: (recipient) => recipient.consents?.sms === true,
    isConfigured: async (config) => Boolean(config.apiKey && PROVIDERS.includes(config.provider as never) && (config.provider !== "twilio" || (config.accountSid && config.sender))),
    sendBatch: async (messages, config) => {
      const results: ChannelSendResult[] = [];
      for (const message of messages) {
        try {
          results.push(config.provider === "twilio" ? await sendTwilio(message, config) : await sendSeven(message, config));
        } catch {
          results.push({ ok: false, error: "SMS_NETWORK" });
        }
      }
      return results;
    },
  },
]);
