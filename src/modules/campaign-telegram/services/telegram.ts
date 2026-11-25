import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { channelFetch, type ChannelConfig } from "@/shared/campaigns/channel";
import { getDb } from "@/shared/db";

const API = "https://api.telegram.org";

const newToken = () => randomBytes(18).toString("base64url");

/** Webhook gizli belirteci bot anahtarından türetilir (ayrı ayar gerekmez; anahtar değişince değişir). */
export function webhookSecret(botToken: string): string {
  return createHash("sha256").update(`verein-erp:telegram-webhook:${botToken}`).digest("base64url").slice(0, 48);
}

export async function telegramCall<T>(botToken: string, method: string, body: unknown): Promise<T> {
  const payload = JSON.stringify(body);
  const response = await channelFetch(
    ["api.telegram.org"],
    `${API}/bot${botToken}/${method}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    },
    { moduleKey: "campaign-telegram", category: "CAMPAIGN", provider: "telegram", volume: Buffer.byteLength(payload), count: 1, unit: "bytes", legalBasis: "CONSENT" },
  );
  const json = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: T; error_code?: number };
  if (!response.ok || !json.ok) throw new Error(`TELEGRAM_${json.error_code ?? response.status}`);
  return json.result as T;
}

/** Davet bağlantıları: her alıcıya rastgele bir belirteç; eşleşmeden sonra yenilenir (#581, tek kullanımlık). */
export async function inviteLinks(recipientKeys: string[], config: ChannelConfig): Promise<Record<string, Record<string, string>>> {
  if (!recipientKeys.length || !config.botUsername) return {};
  const db = getDb();
  await db.campaignTelegramLink.createMany({
    data: recipientKeys.map((recipientKey) => ({ recipientKey, token: newToken() })),
    skipDuplicates: true,
  });
  const rows = await db.campaignTelegramLink.findMany({ where: { recipientKey: { in: recipientKeys } }, select: { recipientKey: true, token: true } });
  const bot = config.botUsername.replace(/^@/, "");
  return Object.fromEntries(rows.map((row) => [row.recipientKey, { telegramLink: `https://t.me/${bot}?start=${row.token}` }]));
}

/** Eşleşmiş sohbet kimlikleri. */
export async function chatIds(recipientKeys: string[]): Promise<Map<string, string>> {
  if (!recipientKeys.length) return new Map();
  const rows = await getDb().campaignTelegramLink.findMany({ where: { recipientKey: { in: recipientKeys }, chatId: { not: null } }, select: { recipientKey: true, chatId: true } });
  return new Map(rows.map((row) => [row.recipientKey, row.chatId as string]));
}

/**
 * Webhook: /start <belirteç> abone eder, /stop aboneliği bitirir. Yanıt metni çağırana döner.
 * #581:
 * - Belirteç tek kullanımlıktır: eşleşmede yenisiyle değiştirilir; iletilmiş eski bağlantı başka bir sohbeti
 *   bu kişiye bağlayamaz.
 * - /start rızayı kaynağın kaydına "verildi", /stop "geri alındı" olarak yazar (mailings `recordChannelConsent`).
 */
export async function handleUpdate(
  update: { message?: { chat?: { id?: number | string }; text?: string } },
  consent: (recipientKey: string, granted: boolean) => Promise<unknown> = async () => undefined,
): Promise<"linked" | "stopped" | "unknown" | "ignored"> {
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? "";
  if (chatId === undefined || !text.startsWith("/")) return "ignored";
  const db = getDb();
  if (text === "/stop") {
    const links = await db.campaignTelegramLink.findMany({ where: { chatId: String(chatId) }, select: { recipientKey: true } });
    await db.campaignTelegramLink.updateMany({ where: { chatId: String(chatId) }, data: { chatId: null, linkedAt: null } });
    for (const link of links) await consent(link.recipientKey, false);
    return "stopped";
  }
  const match = /^\/start\s+([A-Za-z0-9_-]{16,64})$/.exec(text);
  if (!match) return "unknown";
  const link = await db.campaignTelegramLink.findUnique({ where: { token: match[1] }, select: { id: true, recipientKey: true } });
  if (!link) return "unknown";
  // Rıza, belirteç tüketilmeden ÖNCE yazılır: yazım başarısız olursa belirteç ve bağlantı değişmez, aynı
  // /start (Telegram webhook yeniden denemesi veya kişi) tekrar denenebilir. Rıza yazılıp bağlama başarısız
  // olursa sohbet kimliği olmadığından yine gönderim yapılmaz.
  await consent(link.recipientKey, true);
  // Eşzamanlı iki /start: yalnız belirteç hâlâ aynıysa güncellenir (kazanan tek).
  const updated = await db.campaignTelegramLink.updateMany({
    where: { id: link.id, token: match[1] },
    data: { chatId: String(chatId), linkedAt: new Date(), token: newToken() },
  });
  if (!updated.count) return "unknown";
  return "linked";
}
