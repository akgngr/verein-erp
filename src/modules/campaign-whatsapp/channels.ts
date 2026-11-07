import "server-only";

import { channelFetch, defineChannels, normalizePhone, type ChannelSendResult } from "@/shared/campaigns/channel";

/**
 * WhatsApp kanalı (Meta WhatsApp Cloud API). İşletme tarafından başlatılan mesajlar yalnız Meta'nın
 * onayladığı şablonla gönderilebilir: yönetici, gövdesinde tek değişken ({{1}}) olan bir şablon oluşturur;
 * kampanya metni bu değişkene yazılır. Yalnız WhatsApp izni veren kişilere gider.
 */
const GRAPH = "https://graph.facebook.com/v21.0";
const MAX_LENGTH = 1024; // şablon değişkeni üst sınırı

export const channels = defineChannels("campaign-whatsapp", [
  {
    key: "whatsapp",
    icon: "MessageCircle",
    capabilities: { subject: false, html: false, maxLength: MAX_LENGTH },
    settings: [
      { key: "phoneNumberId" },
      { key: "accessToken", secret: true },
      { key: "templateName" },
      { key: "templateLanguage", defaultValue: "de" },
      { key: "countryCode", defaultValue: "49" },
      // Teslim/okundu bildirimleri (Meta webhook): imza anahtarı ve doğrulama belirteci.
      { key: "appSecret", secret: true },
      { key: "verifyToken" },
    ],
    webhookUrls: (_config, origin) => [{ key: "metaWebhook", url: `${origin}/api/campaign-whatsapp/webhook` }],
    // Ülke kodu ayardan: "0151 …" → "+49151…".
    enrich: async (list, config) => list.map((recipient) => ({ ...recipient, phone: normalizePhone(recipient.phone, config.countryCode || "49") })),
    address: (recipient) => normalizePhone(recipient.phone),
    allowed: (recipient) => recipient.consents?.whatsapp === true,
    isConfigured: async (config) => Boolean(/^\d{5,20}$/.test(config.phoneNumberId ?? "") && config.accessToken && config.templateName),
    sendBatch: async (messages, config) => {
      const results: ChannelSendResult[] = [];
      for (const message of messages) {
        try {
          const response = await channelFetch(["graph.facebook.com"], `${GRAPH}/${config.phoneNumberId}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: message.to.replace(/^\+/, ""),
              type: "template",
              template: {
                name: config.templateName,
                language: { code: config.templateLanguage || "de" },
                components: [{ type: "body", parameters: [{ type: "text", text: message.text.replace(/\s*\n\s*/g, " ").slice(0, MAX_LENGTH) }] }],
              },
            }),
          });
          if (!response.ok) {
            results.push({ ok: false, error: `WHATSAPP_HTTP_${response.status}` });
            continue;
          }
          const body = (await response.json().catch(() => ({}))) as { messages?: { id?: string }[] };
          results.push({ ok: true, providerId: body.messages?.[0]?.id });
        } catch {
          results.push({ ok: false, error: "WHATSAPP_NETWORK" });
        }
      }
      return results;
    },
  },
]);
