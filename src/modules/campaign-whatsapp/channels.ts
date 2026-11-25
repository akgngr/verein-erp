import "server-only";

import { channelFetch, defineChannels, normalizePhone, type ChannelSendResult } from "@/shared/campaigns/channel";

/**
 * WhatsApp kanalı (Meta WhatsApp Cloud API). İşletme tarafından başlatılan mesajlar yalnız Meta'nın
 * onayladığı şablonla gönderilebilir: yönetici, gövdesinde tek değişken ({{1}}) olan bir şablon oluşturur;
 * kampanya metni bu değişkene yazılır. Yalnız WhatsApp izni veren kişilere gider.
 */
const GRAPH = "https://graph.facebook.com/v21.0";
const MAX_LENGTH = 1024; // şablon değişkeni üst sınırı

/**
 * #581: Meta şablon değişkeni satır sonu, sekme ve art arda 4'ten fazla boşluk kabul etmez (hata 132018).
 * Tüm boşluk dizileri tek boşluğa indirilir ve kırpılır.
 */
export function sanitizeTemplateParam(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_LENGTH);
}

/** #581: İşlem mesajları (e-imza bağlantısı vb.) ayrı "utility" şablonuyla gider; pazarlama şablonu kullanılmaz. */
export function templateFor(config: Record<string, string>, purpose: "marketing" | "transactional" | undefined): string | null {
  if (purpose === "transactional") return config.utilityTemplateName || null;
  return config.templateName || null;
}

export const channels = defineChannels("campaign-whatsapp", [
  {
    key: "whatsapp",
    icon: "MessageCircle",
    capabilities: { subject: false, html: false, maxLength: MAX_LENGTH },
    settings: [
      { key: "phoneNumberId" },
      { key: "accessToken", secret: true },
      { key: "templateName" },
      { key: "utilityTemplateName" },
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
    isConfigured: async (config, purpose) => Boolean(/^\d{5,20}$/.test(config.phoneNumberId ?? "") && config.accessToken && templateFor(config, purpose)),
    sendBatch: async (messages, config) => {
      const results: ChannelSendResult[] = [];
      for (const message of messages) {
        const template = templateFor(config, message.purpose);
        if (!template) {
          results.push({ ok: false, error: "WHATSAPP_TEMPLATE_MISSING" });
          continue;
        }
        try {
          const payload = JSON.stringify({
            messaging_product: "whatsapp",
            to: message.to.replace(/^\+/, ""),
            type: "template",
            template: {
              name: template,
              language: { code: config.templateLanguage || "de" },
              components: [{ type: "body", parameters: [{ type: "text", text: sanitizeTemplateParam(message.text) }] }],
            },
          });
          const response = await channelFetch(
            ["graph.facebook.com"],
            `${GRAPH}/${config.phoneNumberId}/messages`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${config.accessToken}`, "Content-Type": "application/json" },
              body: payload,
            },
            { moduleKey: "campaign-whatsapp", category: "CAMPAIGN", provider: "whatsapp_meta", volume: Buffer.byteLength(payload), count: 1, unit: "bytes", legalBasis: "CONSENT" },
          );
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
