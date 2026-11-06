import "server-only";

import { defineChannels, type ChannelSendResult } from "@/shared/campaigns/channel";

import { chatIds, inviteLinks, telegramCall, webhookSecret } from "./services/telegram";

/**
 * Telegram kanalı (Bot API). Kişi, kendisine (ör. e-posta kampanyasıyla) gönderilen {telegramLink}
 * bağlantısıyla bota /start yazarak abone olur — bu açık rızadır; /stop ile ayrılır. Yalnız abonelere gider.
 */
export const channels = defineChannels("campaign-telegram", [
  {
    key: "telegram",
    icon: "Send",
    capabilities: { subject: false, html: false, maxLength: 4096 },
    settings: [
      { key: "botToken", secret: true },
      { key: "botUsername" },
    ],
    isConfigured: async (config) => Boolean(/^\d{5,15}:[A-Za-z0-9_-]{30,}$/.test(config.botToken ?? "") && config.botUsername),
    // Webhook'u kaydeder: Telegram güncellemeleri /api/campaign-telegram/webhook adresine gelir.
    setup: async (config, origin) => {
      await telegramCall(config.botToken, "setWebhook", { url: `${origin}/api/campaign-telegram/webhook`, secret_token: webhookSecret(config.botToken), allowed_updates: ["message"] });
    },
    enrich: async (list, _config, sourceId) => {
      const ids = await chatIds(list.map((recipient) => `${sourceId}:${recipient.id}`));
      return list.map((recipient) => ({ ...recipient, telegramChatId: ids.get(`${sourceId}:${recipient.id}`) ?? null }));
    },
    address: (recipient) => recipient.telegramChatId ?? null,
    // Abonelik (/start) kişinin kendi eylemidir; ayrıca itiraz edenler atlanır.
    allowed: (recipient) => Boolean(recipient.telegramChatId) && recipient.consents?.telegram !== false,
    placeholders: { keys: ["telegramLink"], values: inviteLinks },
    sendBatch: async (messages, config) => {
      const results: ChannelSendResult[] = [];
      for (const message of messages) {
        try {
          const sent = await telegramCall<{ message_id: number }>(config.botToken, "sendMessage", { chat_id: message.to, text: message.text.slice(0, 4096), disable_web_page_preview: true });
          results.push({ ok: true, providerId: String(sent.message_id) });
        } catch (error) {
          results.push({ ok: false, error: error instanceof Error ? error.message.slice(0, 40) : "TELEGRAM_FAILED" });
        }
        // Bot API: kişi başı ~30 mesaj/sn sınırı.
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      return results;
    },
  },
]);
