import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import {
  disabledChannelAdapter,
  maskChannelAddress,
  normalizeChannelAddress,
  SECRETARY_EXTERNAL_CHANNELS,
  type SecretaryChannelAdapter,
  type SecretaryExternalChannel,
} from "@/shared/secretary/channels";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { secretaryPermissions } from "../permissions";
import type { BriefingDigest } from "./daily-briefing";
import { berlinClock, isQuietTime } from "./schedule";

const PURPOSE = "secretary-channel";
const CODE_TTL_MS = 15 * 60_000;
export const CHANNEL_LIMITS = { codeAttempts: 5, verificationsPerDay: 3, deliveryAttempts: 3 } as const;

export class ChannelError extends Error {}

export type AdapterResolver = (channel: SecretaryExternalChannel) => SecretaryChannelAdapter;

/**
 * Varsayılan: gerçek sağlayıcı kimliği/yapılandırması bu sürümde bağlı değil → tüm kanallar KAPALI.
 * Gerçek adaptör (kampanya kanal modülleri üzerinden) ayrı, onaylı bir değişiklikle eklenir.
 */
export const defaultAdapters: AdapterResolver = (channel) => disabledChannelAdapter(channel);

const hashCode = (userId: string, channel: string, code: string) => createHash("sha256").update(`${userId}:${channel}:${code}`).digest("hex");
const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export type ConsentView = { channel: SecretaryExternalChannel; status: "pending" | "active" | "revoked"; address: string | null };

export async function listConsents(userId: string): Promise<ConsentView[]> {
  const rows = await getDb().secretaryChannelConsent.findMany({ where: { userId }, select: { channel: true, addressEnc: true, verifiedAt: true, revokedAt: true } });
  return rows.flatMap((row) => {
    if (!(SECRETARY_EXTERNAL_CHANNELS as readonly string[]).includes(row.channel)) return [];
    const address = row.addressEnc ? openSecret(PURPOSE, row.addressEnc) : null;
    return [{
      channel: row.channel as SecretaryExternalChannel,
      status: row.revokedAt ? "revoked" as const : row.verifiedAt ? "active" as const : "pending" as const,
      address: address ? maskChannelAddress(address) : null,
    }];
  });
}

/** Günlük sayaçlı teslim kaydı sahiplenmesi (aynı gün aynı tür için tek satır). */
async function claimDelivery(userId: string, channel: string, day: string, kind: string): Promise<{ id: string } | null> {
  const db = getDb();
  try {
    return await db.secretaryChannelDelivery.create({ data: { userId, channel, day, kind, status: "PENDING", attempts: 1 }, select: { id: true } });
  } catch {
    // Var olan: yalnız başarısız ve deneme hakkı kalan kayıt yeniden sahiplenilir (koşullu güncelleme).
    const retried = await db.secretaryChannelDelivery.updateMany({
      where: { userId, channel, day, kind, status: "FAILED", attempts: { lt: CHANNEL_LIMITS.deliveryAttempts } },
      data: { status: "PENDING", attempts: { increment: 1 } },
    });
    if (retried.count !== 1) return null;
    return db.secretaryChannelDelivery.findUnique({ where: { userId_channel_day_kind: { userId, channel, day, kind } }, select: { id: true } });
  }
}

async function finishDelivery(id: string, result: { ok: boolean; providerId?: string; errorCode?: string }) {
  await getDb().secretaryChannelDelivery.update({
    where: { id },
    data: result.ok ? { status: "SENT", providerId: result.providerId?.slice(0, 200) ?? null, errorCode: null } : { status: "FAILED", errorCode: (result.errorCode ?? "CHANNEL_SEND_FAILED").slice(0, 80) },
  });
}

/**
 * Rıza başlat: adres doğrulanır, sağlayıcı yapılandırılmamışsa hiçbir şey saklanmadan reddedilir (fail-closed).
 * Doğrulama kodu kanala gönderilir; kod yalnız hash olarak saklanır. Günlük doğrulama gönderimi sınırlıdır.
 */
export async function requestConsent(user: { id: string; role: Role }, channel: SecretaryExternalChannel, rawAddress: string, adapters: AdapterResolver = defaultAdapters, now = new Date()): Promise<void> {
  if (!can(user.role, secretaryPermissions, "view")) throw new ChannelError("secretary.channels.errors.forbidden");
  const address = normalizeChannelAddress(channel, rawAddress);
  if (!address) throw new ChannelError("secretary.channels.errors.addressInvalid");
  const adapter = adapters(channel);
  if (!(await adapter.isConfigured())) throw new ChannelError("secretary.channels.errors.unavailable");
  const day = berlinClock(now).date;
  const sentToday = await getDb().secretaryChannelDelivery.count({ where: { userId: user.id, channel, day, kind: { startsWith: "verification" } } });
  if (sentToday >= CHANNEL_LIMITS.verificationsPerDay) throw new ChannelError("secretary.channels.errors.rateLimited");
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await getDb().secretaryChannelConsent.upsert({
    where: { userId_channel: { userId: user.id, channel } },
    create: { userId: user.id, channel, addressEnc: sealSecret(PURPOSE, address), codeHash: hashCode(user.id, channel, code), codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS) },
    update: { addressEnc: sealSecret(PURPOSE, address), codeHash: hashCode(user.id, channel, code), codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS), codeAttempts: 0, verifiedAt: null, revokedAt: null },
  });
  const delivery = await claimDelivery(user.id, channel, day, `verification-${sentToday + 1}`);
  if (!delivery) throw new ChannelError("secretary.channels.errors.rateLimited");
  const result = await adapter.send({ to: address, text: `Verein ERP: ${code}`, reference: delivery.id }).catch(() => ({ ok: false, errorCode: "CHANNEL_SEND_FAILED" }));
  await finishDelivery(delivery.id, result);
  if (!result.ok) throw new ChannelError("secretary.channels.errors.sendFailed");
}

/** Kodu doğrular; sınırlı deneme, süre sonu, sabit zamanlı karşılaştırma. */
export async function confirmConsent(userId: string, channel: SecretaryExternalChannel, code: string, now = new Date()): Promise<void> {
  const db = getDb();
  const row = await db.secretaryChannelConsent.findUnique({ where: { userId_channel: { userId, channel } } });
  if (!row || row.revokedAt || row.verifiedAt || !row.codeHash || !row.codeExpiresAt) throw new ChannelError("secretary.channels.errors.notPending");
  if (row.codeExpiresAt <= now || row.codeAttempts >= CHANNEL_LIMITS.codeAttempts) throw new ChannelError("secretary.channels.errors.codeExpired");
  const counted = await db.secretaryChannelConsent.updateMany({ where: { id: row.id, codeAttempts: row.codeAttempts }, data: { codeAttempts: { increment: 1 } } });
  if (counted.count !== 1) throw new ChannelError("secretary.channels.errors.codeInvalid");
  if (!/^\d{6}$/.test(code) || !sameHash(row.codeHash, hashCode(userId, channel, code))) throw new ChannelError("secretary.channels.errors.codeInvalid");
  await db.secretaryChannelConsent.update({ where: { id: row.id }, data: { verifiedAt: now, codeHash: null, codeExpiresAt: null } });
}

/** Rızayı geri al: adres ve kod silinir; sonraki teslimler hemen durur. */
export async function revokeConsent(userId: string, channel: SecretaryExternalChannel, now = new Date()): Promise<void> {
  await getDb().secretaryChannelConsent.updateMany({ where: { userId, channel }, data: { revokedAt: now, addressEnc: null, codeHash: null, codeExpiresAt: null } });
}

/** Etkin (doğrulanmış, geri alınmamış) kanallar. */
export async function activeChannels(userId: string): Promise<SecretaryExternalChannel[]> {
  const rows = await getDb().secretaryChannelConsent.findMany({ where: { userId, verifiedAt: { not: null }, revokedAt: null, addressEnc: { not: null } }, select: { channel: true } });
  return rows.map((row) => row.channel).filter((channel): channel is SecretaryExternalChannel => (SECRETARY_EXTERNAL_CHANNELS as readonly string[]).includes(channel));
}

/** Yalnız sayılar; ad, başlık, tutar yok. */
export function channelDigestText(digest: BriefingDigest, locale: "tr" | "de"): string {
  const n = (value: number) => (Number.isSafeInteger(value) && value >= 0 ? value : 0);
  return locale === "de"
    ? `Verein ERP ${digest.date}: ${n(digest.total)} Einträge (${n(digest.danger)} dringend, ${n(digest.warning)} Achtung).`
    : `Verein ERP ${digest.date}: ${n(digest.total)} kayıt (${n(digest.danger)} acil, ${n(digest.warning)} dikkat).`;
}

export type ChannelDeliveryDeps = {
  adapters?: AdapterResolver;
  locale: "tr" | "de";
  quiet?: { quietFrom: string | null; quietTo: string | null } | null;
};

/**
 * Günlük özetin dış kanala teslimi. Kapılar: rıza (her çağrıda yeniden okunur), sağlayıcı yapılandırması,
 * sessiz saat, kanal+gün başına tek teslim (claim) ve sınırlı yeniden deneme. Gövde yalnız sayılar.
 */
export async function deliverDigestToChannel(user: { id: string; role: Role; isActive: boolean }, channel: SecretaryExternalChannel, digest: BriefingDigest, deps: ChannelDeliveryDeps, now = new Date()): Promise<"sent" | "skipped"> {
  if (!user.isActive || !can(user.role, secretaryPermissions, "view")) return "skipped";
  const consent = await getDb().secretaryChannelConsent.findUnique({ where: { userId_channel: { userId: user.id, channel } } });
  const address = consent?.verifiedAt && !consent.revokedAt && consent.addressEnc ? openSecret(PURPOSE, consent.addressEnc) : null;
  if (!address) return "skipped";
  const adapter = (deps.adapters ?? defaultAdapters)(channel);
  if (!(await adapter.isConfigured())) return "skipped";
  const clock = berlinClock(now);
  if (deps.quiet && isQuietTime(clock.minutes, deps.quiet.quietFrom, deps.quiet.quietTo)) return "skipped";
  const delivery = await claimDelivery(user.id, channel, digest.date, "daily-digest");
  if (!delivery) return "skipped";
  const result = await adapter.send({ to: address, text: channelDigestText(digest, deps.locale), reference: delivery.id }).catch(() => ({ ok: false, errorCode: "CHANNEL_SEND_FAILED" }));
  await finishDelivery(delivery.id, result);
  if (!result.ok) throw new ChannelError("CHANNEL_SEND_FAILED");
  return "sent";
}
