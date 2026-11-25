import { getTranslations } from "next-intl/server";

import { getChannelConfig, recordChannelConsent } from "@/modules/mailings/server";
import { readWebhookBody, sameSecret } from "@/shared/campaigns/webhook-body";

import { handleUpdate, telegramCall, webhookSecret } from "../../services/telegram";

/**
 * POST /api/campaign-telegram/webhook — Telegram Bot API güncellemeleri. Oturum yok: Telegram'ın
 * `X-Telegram-Bot-Api-Secret-Token` başlığı, bot anahtarından türetilen gizli değerle karşılaştırılır
 * (src/proxy.ts bu yolu oturum kontrolünden hariç tutar). Her durumda 200 döner (Telegram tekrar denemesin).
 */
export async function POST(request: Request) {
  const config = await getChannelConfig("telegram");
  if (!config.botToken) return new Response(null, { status: 404 });
  if (!sameSecret(request.headers.get("x-telegram-bot-api-secret-token") ?? "", webhookSecret(config.botToken))) {
    return new Response(null, { status: 401 });
  }

  // #581: Gövde boyutu sınırlıdır (oturumsuz uç).
  const raw = await readWebhookBody(request);
  if (raw === null) return new Response(null, { status: 413 });
  let update: Parameters<typeof handleUpdate>[0] = {};
  try {
    update = JSON.parse(raw || "{}") as Parameters<typeof handleUpdate>[0];
  } catch {
    update = {};
  }
  const result = await handleUpdate(update, (recipientKey, granted) =>
    recordChannelConsent(recipientKey, "telegram", granted, granted ? "Telegram /start" : "Telegram /stop"),
  );
  const chatId = update.message?.chat?.id;
  if (chatId !== undefined && result !== "ignored") {
    // Kişinin dili bilinmez: yanıt Türkçe ve Almanca birlikte gönderilir.
    const [tr, de] = await Promise.all([getTranslations({ locale: "tr", namespace: "campaign-telegram.replies" }), getTranslations({ locale: "de", namespace: "campaign-telegram.replies" })]);
    await telegramCall(config.botToken, "sendMessage", { chat_id: chatId, text: `${tr(result)}\n${de(result)}` }).catch(() => undefined);
  }
  return Response.json({ ok: true });
}
