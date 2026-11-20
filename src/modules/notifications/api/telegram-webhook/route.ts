import { timingSafeEqual } from "node:crypto";

import { getChannelConfig } from "../../services/channel-config";
import { handleTelegramUpdate, sendTelegram, webhookSecret } from "../../services/telegram";

/**
 * POST /api/notifications/telegram-webhook — bildirim botunun güncellemeleri (N4 #361). Oturum yok: Telegram'ın
 * `X-Telegram-Bot-Api-Secret-Token` başlığı bot token'ından türetilen gizli değerle sabit zamanlı karşılaştırılır
 * (src/proxy.ts bu yolu oturum kontrolünden hariç tutar). Geçerli isteklerde her durumda 200 döner.
 */
export async function POST(request: Request) {
  const config = await getChannelConfig("telegram");
  if (!config.enabled || !config.secrets.botToken) return new Response(null, { status: 404 });
  const expected = Buffer.from(webhookSecret(config.secrets.botToken));
  const given = Buffer.from(request.headers.get("x-telegram-bot-api-secret-token") ?? "");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return new Response(null, { status: 401 });
  const update = await request.json().catch(() => null);
  if (!update || typeof update !== "object") return new Response(null, { status: 200 });
  const outcome = await handleTelegramUpdate(update as Parameters<typeof handleTelegramUpdate>[0]).catch(() => "ignored" as const);
  const chatId = (update as { message?: { chat?: { id?: number | string } } }).message?.chat?.id;
  if (chatId !== undefined && (outcome === "linked" || outcome === "stopped" || outcome === "unknown")) {
    // Yanıt metni sabit ve kişisel veri içermez (dil: kurum belge dili).
    const { getEnv } = await import("@/shared/env");
    const de = getEnv().DOCUMENT_LANGUAGE === "de";
    const text = outcome === "linked"
      ? (de ? "Verein ERP: Benachrichtigungen sind verbunden. /stop beendet die Verbindung." : "Verein ERP: bildirimler bağlandı. /stop ile bağı kaldırabilirsiniz.") // i18n-ignore
      : outcome === "stopped"
        ? (de ? "Verein ERP: Verbindung beendet." : "Verein ERP: bağ kaldırıldı.") // i18n-ignore
        : (de ? "Verein ERP: Link ungültig oder abgelaufen. Bitte in der Anwendung neu erstellen." : "Verein ERP: bağlantı geçersiz veya süresi dolmuş. Uygulamada yeniden oluşturun."); // i18n-ignore
    await sendTelegram(String(chatId), text).catch(() => undefined);
  }
  return new Response(null, { status: 200 });
}
