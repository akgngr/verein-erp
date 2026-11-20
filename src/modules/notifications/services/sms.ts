import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { channelFetch, normalizePhone } from "@/shared/campaigns/channel";
import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { getChannelConfig, saveChannelConfig } from "./channel-config";

/**
 * N6b (#363) — SMS kanalı (varsayılan KAPALI). Sağlayıcı seven.io (Almanya) veya Twilio; anahtar DB'de şifreli.
 * Kullanıcı numarasını 6 haneli kodla doğrular (kod yalnız hash, 15 dk, 5 deneme, günde 3 kod). Mesaj yalnız
 * genel metin + bağlantı. Kampanya modülünün SMS ayarından bağımsızdır (çalışan bildirimi ≠ üye kampanyası).
 */
const ADDRESS_PURPOSE = "notification-channel-address";
const CODE_TTL_MS = 15 * 60_000;
export const SMS_LIMITS = { codeAttempts: 5, codesPerDay: 3, maxLength: 306 } as const;
export const SMS_PROVIDERS = ["seven", "twilio"] as const;

export class SmsError extends Error {}

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const codeHash = (userId: string, code: string) => sha(`sms:${userId}:${code}`);

export type SmsTransport = (input: { provider: string; apiKey: string; accountSid?: string; sender?: string; to: string; text: string }) => Promise<{ ok: boolean; providerId?: string }>;

export const smsTransport: SmsTransport = async ({ provider, apiKey, accountSid, sender, to, text }) => {
  const body = text.slice(0, SMS_LIMITS.maxLength);
  if (provider === "seven") {
    const response = await channelFetch(["seven.io"], "https://gateway.seven.io/api/sms", {
      method: "POST",
      headers: { "X-Api-Key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ to, text: body, from: sender || undefined }),
    });
    if (!response.ok) return { ok: false };
    const json = (await response.json().catch(() => ({}))) as { success?: string; messages?: { id?: string; success?: boolean }[] };
    const first = json.messages?.[0];
    return first?.success === false || (json.success && json.success !== "100") ? { ok: false } : { ok: true, providerId: first?.id };
  }
  if (provider === "twilio") {
    if (!accountSid || !/^AC[0-9a-f]{32}$/i.test(accountSid)) return { ok: false };
    const response = await channelFetch(["api.twilio.com"], `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${accountSid}:${apiKey}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: sender ?? "", Body: body }),
    });
    if (!response.ok) return { ok: false };
    const json = (await response.json().catch(() => ({}))) as { sid?: string };
    return { ok: true, providerId: json.sid };
  }
  return { ok: false };
};

/** Yönetici: sağlayıcı ve anahtarlar (boş bırakılan sır korunur). */
export async function configureSms(input: { enabled: boolean; provider?: string; apiKey?: string; accountSid?: string; sender?: string }, actorId: string): Promise<void> {
  const current = await getChannelConfig("sms");
  const provider = input.provider ?? current.settings.provider;
  if (input.enabled) {
    if (!provider || !(SMS_PROVIDERS as readonly string[]).includes(provider)) throw new SmsError("notifications.channels.errors.smsProvider");
    const apiKey = input.apiKey?.trim() || current.secrets.apiKey;
    if (!apiKey) throw new SmsError("notifications.channels.errors.smsProvider");
    const sid = input.accountSid?.trim() || current.settings.accountSid;
    if (provider === "twilio" && (!sid || !/^AC[0-9a-f]{32}$/i.test(sid))) throw new SmsError("notifications.channels.errors.smsProvider");
  }
  await saveChannelConfig("sms", {
    enabled: input.enabled,
    secrets: { apiKey: input.apiKey ?? "" },
    settings: { ...(provider ? { provider } : {}), ...(input.accountSid?.trim() ? { accountSid: input.accountSid.trim() } : {}), ...(input.sender !== undefined ? { sender: input.sender.trim().slice(0, 16) } : {}) },
  }, actorId);
}

async function send(to: string, text: string, transport: SmsTransport): Promise<{ ok: boolean; providerId?: string }> {
  const config = await getChannelConfig("sms");
  if (!config.enabled || !config.secrets.apiKey || !config.settings.provider) return { ok: false };
  return transport({ provider: config.settings.provider, apiKey: config.secrets.apiKey, accountSid: config.settings.accountSid, sender: config.settings.sender, to, text }).catch(() => ({ ok: false }));
}

/** Kullanıcı: numarayı doğrulamak için kod gönder. Kanal kapalıysa hiçbir şey saklanmaz. */
export async function requestSmsVerification(userId: string, rawPhone: string, transport: SmsTransport = smsTransport, now = new Date()): Promise<void> {
  const config = await getChannelConfig("sms");
  if (!config.enabled || !config.secrets.apiKey) throw new SmsError("notifications.channels.errors.unavailable");
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new SmsError("notifications.channels.errors.phoneInvalid");
  const db = getDb();
  const dayStart = new Date(now.getTime() - 24 * 3_600_000);
  const sent = await db.notificationDelivery.count({ where: { userId, channel: "sms", dedupeKey: { startsWith: "verify:" }, createdAt: { gte: dayStart } } });
  if (sent >= SMS_LIMITS.codesPerDay) throw new SmsError("notifications.channels.errors.rateLimited");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.notificationChannelLink.upsert({
    where: { userId_channel: { userId, channel: "sms" } },
    create: { userId, channel: "sms", addressEnc: sealSecret(ADDRESS_PURPOSE, phone), addressHash: sha(phone), linkTokenHash: codeHash(userId, code), linkExpiresAt: new Date(now.getTime() + CODE_TTL_MS) },
    update: { addressEnc: sealSecret(ADDRESS_PURPOSE, phone), addressHash: sha(phone), linkTokenHash: codeHash(userId, code), linkExpiresAt: new Date(now.getTime() + CODE_TTL_MS), verifiedAt: null, revokedAt: null },
  });
  await db.notificationDelivery.create({ data: { userId, channel: "sms", dedupeKey: `verify:${now.getTime()}`, status: "PENDING", attempts: 1 } });
  const result = await send(phone, `Verein ERP: ${code}`, transport);
  if (!result.ok) throw new SmsError("notifications.channels.errors.sendFailed");
}

/** Kodu doğrula: süreli, sabit zamanlı karşılaştırma; başarısız denemeler sayılır. */
export async function confirmSmsVerification(userId: string, code: string, now = new Date()): Promise<void> {
  const db = getDb();
  const row = await db.notificationChannelLink.findUnique({ where: { userId_channel: { userId, channel: "sms" } } });
  if (!row?.linkTokenHash || !row.linkExpiresAt || row.linkExpiresAt <= now) throw new SmsError("notifications.channels.errors.codeExpired");
  const attempts = await db.notificationDelivery.count({ where: { userId, channel: "sms", dedupeKey: { startsWith: "code-fail:" }, createdAt: { gte: new Date(row.linkExpiresAt.getTime() - CODE_TTL_MS) } } });
  if (attempts >= SMS_LIMITS.codeAttempts) throw new SmsError("notifications.channels.errors.codeExpired");
  const expected = Buffer.from(row.linkTokenHash);
  const given = Buffer.from(/^\d{6}$/.test(code) ? codeHash(userId, code) : "x".repeat(expected.length));
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await db.notificationDelivery.create({ data: { userId, channel: "sms", dedupeKey: `code-fail:${now.getTime()}:${Math.random()}`, status: "FAILED", attempts: 1 } });
    throw new SmsError("notifications.channels.errors.codeInvalid");
  }
  await db.notificationChannelLink.update({ where: { id: row.id }, data: { verifiedAt: now, linkTokenHash: null, linkExpiresAt: null } });
}

export async function revokeSms(userId: string, now = new Date()): Promise<void> {
  await getDb().notificationChannelLink.updateMany({ where: { userId, channel: "sms" }, data: { revokedAt: now, addressEnc: null, addressHash: null, linkTokenHash: null, linkExpiresAt: null, verifiedAt: null } });
}

export async function smsNumberFor(userId: string): Promise<string | null> {
  const row = await getDb().notificationChannelLink.findUnique({ where: { userId_channel: { userId, channel: "sms" } } });
  if (!row?.verifiedAt || row.revokedAt || !row.addressEnc) return null;
  return openSecret(ADDRESS_PURPOSE, row.addressEnc);
}

/** Dağıtıcı: doğrulanmış numaraya genel metin. */
export async function sendSms(userId: string, text: string, transport: SmsTransport = smsTransport): Promise<{ ok: boolean; providerId?: string } | null> {
  const phone = await smsNumberFor(userId);
  if (!phone) return null;
  return send(phone, text, transport);
}

export async function smsAvailable(): Promise<boolean> {
  const config = await getChannelConfig("sms");
  return config.enabled && Boolean(config.secrets.apiKey) && Boolean(config.settings.provider);
}
