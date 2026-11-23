import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { channelFetch } from "@/shared/campaigns/channel";
import { getDb } from "@/shared/db";
import { recordEgress } from "@/shared/egress/record-egress";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { getChannelConfig, saveChannelConfig } from "./channel-config";

/**
 * N4 (#361) — Telegram kanalı. Bot token'ı DB'de şifreli; kullanıcı tek kullanımlık, 15 dakikalık bir derin
 * bağlantıyla (`t.me/<bot>?start=<belirteç>`) sohbetini bağlar. Webhook, bot token'ından türetilen gizli başlıkla
 * doğrulanır. Mesajlar yalnız genel metin + uygulama bağlantısıdır. Not: kampanya modülünün botundan AYRI bir bot
 * kullanılmalıdır (Telegram'da bir botun tek webhook'u olur).
 */
const API = "https://api.telegram.org";
const ADDRESS_PURPOSE = "notification-channel-address";
const LINK_TTL_MS = 15 * 60_000;
export const TELEGRAM_WEBHOOK_PATH = "/api/notifications/telegram-webhook";

export class TelegramError extends Error {}

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
export const webhookSecret = (botToken: string) => createHash("sha256").update(`verein-erp:notifications-telegram:${botToken}`).digest("base64url").slice(0, 48);

export type TelegramTransport = <T>(botToken: string, method: string, body: unknown) => Promise<T>;

export const telegramCall: TelegramTransport = async <T>(botToken: string, method: string, body: unknown): Promise<T> => {
  const payload = JSON.stringify(body);
  const response = await channelFetch(
    ["api.telegram.org"],
    `${API}/bot${botToken}/${method}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: payload },
    { moduleKey: "notifications", category: "NOTIFICATION", provider: "telegram", volume: Buffer.byteLength(payload), count: 1, unit: "bytes", legalBasis: "CONSENT" },
  );
  const json = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: T; error_code?: number };
  if (!response.ok || !json.ok) throw new TelegramError(`TELEGRAM_${json.error_code ?? response.status}`);
  return json.result as T;
};

/**
 * Yönetici: token kaydı + doğrulama (getMe) + webhook kaydı. Token boşsa mevcut korunur. Uygulama adresi https olmalı.
 */
export async function configureTelegram(input: { enabled: boolean; botToken?: string }, appUrl: string | undefined, actorId: string, call: TelegramTransport = telegramCall): Promise<{ botUsername: string | null }> {
  const current = await getChannelConfig("telegram");
  const botToken = input.botToken?.trim() || current.secrets.botToken;
  if (!input.enabled) {
    await saveChannelConfig("telegram", { enabled: false }, actorId);
    return { botUsername: current.settings.botUsername ?? null };
  }
  if (!botToken || !/^\d{5,15}:[A-Za-z0-9_-]{30,64}$/.test(botToken)) throw new TelegramError("notifications.channels.errors.telegramToken");
  let origin: URL;
  try {
    origin = new URL(appUrl ?? "");
  } catch {
    throw new TelegramError("notifications.channels.errors.appUrl");
  }
  if (origin.protocol !== "https:") throw new TelegramError("notifications.channels.errors.appUrl");
  const me = await call<{ username?: string }>(botToken, "getMe", {}).catch(() => { throw new TelegramError("notifications.channels.errors.telegramToken"); });
  await call(botToken, "setWebhook", { url: new URL(TELEGRAM_WEBHOOK_PATH, origin.origin).toString(), secret_token: webhookSecret(botToken), allowed_updates: ["message"] })
    .catch(() => { throw new TelegramError("notifications.channels.errors.telegramWebhook"); });
  await saveChannelConfig("telegram", { enabled: true, secrets: { botToken }, settings: { botUsername: me.username ?? "" } }, actorId);
  return { botUsername: me.username ?? null };
}

/** Kullanıcı: tek kullanımlık bağlama bağlantısı (yalnız hash saklanır). */
export async function requestTelegramLink(userId: string, now = new Date()): Promise<{ url: string; expiresAt: string }> {
  const config = await getChannelConfig("telegram");
  const bot = config.settings.botUsername?.replace(/^@/, "");
  if (!config.enabled || !config.secrets.botToken || !bot) throw new TelegramError("notifications.channels.errors.unavailable");
  const token = randomBytes(24).toString("base64url");
  const expires = new Date(now.getTime() + LINK_TTL_MS);
  await getDb().notificationChannelLink.upsert({
    where: { userId_channel: { userId, channel: "telegram" } },
    create: { userId, channel: "telegram", linkTokenHash: sha(token), linkExpiresAt: expires },
    update: { linkTokenHash: sha(token), linkExpiresAt: expires },
  });
  return { url: `https://t.me/${bot}?start=${token}`, expiresAt: expires.toISOString() };
}

export async function revokeTelegramLink(userId: string, now = new Date()): Promise<void> {
  await getDb().notificationChannelLink.updateMany({ where: { userId, channel: "telegram" }, data: { revokedAt: now, addressEnc: null, addressHash: null, linkTokenHash: null, linkExpiresAt: null, verifiedAt: null } });
}

type Update = { message?: { chat?: { id?: number | string; type?: string }; text?: string } };

/** Webhook: /start <belirteç> bağlar (yalnız özel sohbet), /stop bağı kaldırır. */
export async function handleTelegramUpdate(update: Update, now = new Date()): Promise<"linked" | "stopped" | "unknown" | "ignored"> {
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim() ?? "";
  if (chatId === undefined || !text.startsWith("/")) return "ignored";
  if (update.message?.chat?.type && update.message.chat.type !== "private") return "ignored";
  const db = getDb();
  const chat = String(chatId);
  if (text === "/stop") {
    const stopped = await db.notificationChannelLink.updateMany({ where: { channel: "telegram", addressHash: sha(chat) }, data: { revokedAt: now, addressEnc: null, addressHash: null, verifiedAt: null } });
    return stopped.count ? "stopped" : "unknown";
  }
  const match = /^\/start\s+([A-Za-z0-9_-]{24,64})$/.exec(text);
  if (!match) return "unknown";
  const linked = await db.notificationChannelLink.updateMany({
    where: { channel: "telegram", linkTokenHash: sha(match[1]), linkExpiresAt: { gt: now } },
    data: { addressEnc: sealSecret(ADDRESS_PURPOSE, chat), addressHash: sha(chat), verifiedAt: now, revokedAt: null, linkTokenHash: null, linkExpiresAt: null },
  });
  return linked.count ? "linked" : "unknown";
}

/** Doğrulanmış sohbet kimliği (yoksa null). */
export async function telegramChatFor(userId: string): Promise<string | null> {
  const row = await getDb().notificationChannelLink.findUnique({ where: { userId_channel: { userId, channel: "telegram" } } });
  if (!row?.verifiedAt || row.revokedAt || !row.addressEnc) return null;
  return openSecret(ADDRESS_PURPOSE, row.addressEnc);
}

export async function telegramLinkStatus(userId: string, now = new Date()): Promise<"linked" | "pending" | "none"> {
  const row = await getDb().notificationChannelLink.findUnique({ where: { userId_channel: { userId, channel: "telegram" } } });
  if (row?.verifiedAt && !row.revokedAt && row.addressEnc) return "linked";
  if (row?.linkTokenHash && row.linkExpiresAt && row.linkExpiresAt > now) return "pending";
  return "none";
}

/** Gönderim (dağıtıcı kullanır): yalnız genel metin. */
export async function sendTelegram(chatId: string, text: string, call: TelegramTransport = telegramCall): Promise<{ ok: boolean; providerId?: string }> {
  const config = await getChannelConfig("telegram");
  if (!config.enabled || !config.secrets.botToken) return { ok: false };
  try {
    const result = await call<{ message_id?: number }>(config.secrets.botToken, "sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
    return { ok: true, providerId: result.message_id !== undefined ? String(result.message_id) : undefined };
  } catch {
    return { ok: false };
  } finally {
    if (call !== telegramCall) {
      await recordEgress({
        moduleKey: "notifications",
        category: "NOTIFICATION",
        provider: "telegram",
        volume: Buffer.byteLength(text),
        count: 1,
        unit: "bytes",
        legalBasis: "CONSENT",
      });
    }
  }
}

/**
 * N6 (#363) geçişi: başka bir modülde doğrulanmış kanal adresini (ör. sekreter rızası) bağ olarak içe alır.
 * Kullanıcının o kanalda bağı varsa dokunmaz. Adres şifreli, arama hash ile.
 */
export async function importVerifiedChannelLink(userId: string, channel: "telegram" | "whatsapp" | "sms", address: string, verifiedAt: Date): Promise<boolean> {
  const db = getDb();
  if (await db.notificationChannelLink.findUnique({ where: { userId_channel: { userId, channel } }, select: { id: true } })) return false;
  await db.notificationChannelLink.create({ data: { userId, channel, addressEnc: sealSecret(ADDRESS_PURPOSE, address), addressHash: sha(address), verifiedAt } }).catch(() => undefined);
  return true;
}
