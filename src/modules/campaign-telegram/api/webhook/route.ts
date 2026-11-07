import { timingSafeEqual } from "node:crypto";

import { getTranslations } from "next-intl/server";

import { getChannelConfig } from "@/modules/mailings/server";

import { handleUpdate, telegramCall, webhookSecret } from "../../services/telegram";

/**
 * POST /api/campaign-telegram/webhook — Telegram Bot API güncellemeleri. Oturum yok: Telegram'ın
 * `X-Telegram-Bot-Api-Secret-Token` başlığı, bot anahtarından türetilen gizli değerle karşılaştırılır
 * (src/proxy.ts bu yolu oturum kontrolünden hariç tutar). Her durumda 200 döner (Telegram tekrar denemesin).
 */
export async function POST(request: Request) {
  const config = await getChannelConfig("telegram");
  if (!config.botToken) return new Response(null, { status: 404 });
  const expected = Buffer.from(webhookSecret(config.botToken));
  const given = Buffer.from(request.headers.get("x-telegram-bot-api-secret-token") ?? "");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response(null, { status: 401 });

  const update = (await request.json().catch(() => ({}))) as Parameters<typeof handleUpdate>[0];
  const result = await handleUpdate(update);
  const chatId = update.message?.chat?.id;
  if (chatId !== undefined && result !== "ignored") {
    // Kişinin dili bilinmez: yanıt Türkçe ve Almanca birlikte gönderilir.
    const [tr, de] = await Promise.all([getTranslations({ locale: "tr", namespace: "campaign-telegram.replies" }), getTranslations({ locale: "de", namespace: "campaign-telegram.replies" })]);
    await telegramCall(config.botToken, "sendMessage", { chat_id: chatId, text: `${tr(result)}\n${de(result)}` }).catch(() => undefined);
  }
  return Response.json({ ok: true });
}
