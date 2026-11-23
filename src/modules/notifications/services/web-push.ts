import "server-only";

import { createHash } from "node:crypto";

import { z } from "zod";

import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { getChannelConfig, saveChannelConfig } from "./channel-config";

/**
 * N3a (#359) — Web Push. VAPID anahtar çifti ilk açılışta üretilir ve DB'de şifreli saklanır (ortam değişkeni yok).
 * Abonelik uç noktası yalnız bilinen push servislerine izin verir (SSRF önlemi). Yük yalnız genel metin + bağlantı.
 * Push servisi 404/410 dönerse abonelik silinir; diğer hatalarda sayaç artar, 5 hatada silinir.
 */
const PURPOSE = "notification-push-subscription";
const MAX_PER_USER = 10;
const MAX_FAILURES = 5;
const PUSH_HOSTS = ["fcm.googleapis.com", "updates.push.services.mozilla.com", "push.services.mozilla.com", "web.push.apple.com", "notify.windows.com"];

export class WebPushError extends Error {}

type WebPushLib = {
  generateVAPIDKeys: () => { publicKey: string; privateKey: string };
  sendNotification: (subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: string, options: Record<string, unknown>) => Promise<{ statusCode: number }>;
};
export type PushTransport = WebPushLib["sendNotification"];

/** web-push 4.x saf ESM'dir ve default export içermez; 3.x CJS default'unu da destekler. */
async function lib(): Promise<WebPushLib> {
  const mod = (await import("web-push")) as unknown as Partial<WebPushLib> & { default?: WebPushLib };
  const resolved = mod.default ?? mod;
  if (typeof resolved.sendNotification !== "function" || typeof resolved.generateVAPIDKeys !== "function") throw new WebPushError("notifications.channels.errors.unavailable");
  return resolved as WebPushLib;
}

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && !url.username && !url.password && PUSH_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export const subscriptionSchema = z.object({
  endpoint: z.string().max(1000).refine(isAllowedPushEndpoint, "PUSH_ENDPOINT_NOT_ALLOWED"),
  keys: z.object({ p256dh: z.string().regex(/^[A-Za-z0-9_-]{40,200}$/), auth: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/) }).strict(),
}).strict();

/** Yönetici: kanalı aç/kapat; anahtar yoksa üretilir. Konu (subject) uygulama adresidir (https). */
export async function configureWebPush(enabled: boolean, appUrl: string | undefined, actorId: string, generate?: () => { publicKey: string; privateKey: string }): Promise<{ publicKey: string | null }> {
  const current = await getChannelConfig("web_push");
  if (!enabled) {
    await saveChannelConfig("web_push", { enabled: false }, actorId);
    return { publicKey: current.settings.publicKey ?? null };
  }
  let origin: URL;
  try {
    origin = new URL(appUrl ?? "");
  } catch {
    throw new WebPushError("notifications.channels.errors.appUrl");
  }
  if (origin.protocol !== "https:") throw new WebPushError("notifications.channels.errors.appUrl");
  if (current.secrets.privateKey && current.settings.publicKey) {
    await saveChannelConfig("web_push", { enabled: true, settings: { subject: origin.origin } }, actorId);
    return { publicKey: current.settings.publicKey };
  }
  const keys = (generate ?? (await lib()).generateVAPIDKeys)();
  await saveChannelConfig("web_push", { enabled: true, secrets: { privateKey: keys.privateKey }, settings: { publicKey: keys.publicKey, subject: origin.origin } }, actorId);
  return { publicKey: keys.publicKey };
}

export async function publicKey(): Promise<string | null> {
  const config = await getChannelConfig("web_push");
  return config.enabled && config.secrets.privateKey ? config.settings.publicKey ?? null : null;
}

/** Kullanıcı aboneliği (uç nokta başına tek kayıt; başka kullanıcıya aitse devralınır — tarayıcı oturumu değişmiştir). */
export async function subscribe(userId: string, input: z.infer<typeof subscriptionSchema>): Promise<void> {
  if (!(await publicKey())) throw new WebPushError("notifications.channels.errors.unavailable");
  const db = getDb();
  if ((await db.notificationPushSubscription.count({ where: { userId } })) >= MAX_PER_USER) {
    const oldest = await db.notificationPushSubscription.findFirst({ where: { userId }, orderBy: { lastSeenAt: "asc" }, select: { id: true } });
    if (oldest) await db.notificationPushSubscription.delete({ where: { id: oldest.id } });
  }
  const data = { userId, endpointEnc: sealSecret(PURPOSE, input.endpoint), keysEnc: sealSecret(PURPOSE, JSON.stringify(input.keys)), failureCount: 0, lastSeenAt: new Date() };
  await db.notificationPushSubscription.upsert({ where: { endpointHash: sha(input.endpoint) }, create: { endpointHash: sha(input.endpoint), ...data }, update: data });
}

export async function unsubscribe(userId: string, endpoint: string): Promise<void> {
  await getDb().notificationPushSubscription.deleteMany({ where: { userId, endpointHash: sha(endpoint) } });
}

/** Dağıtıcı: kullanıcının tüm aboneliklerine gönder. null = abonelik yok. */
export async function sendPush(userId: string, message: { title: string; body: string; url: string }, transport?: PushTransport): Promise<{ ok: boolean } | null> {
  const config = await getChannelConfig("web_push");
  if (!config.enabled || !config.secrets.privateKey || !config.settings.publicKey) return null;
  const db = getDb();
  const subs = await db.notificationPushSubscription.findMany({ where: { userId }, take: MAX_PER_USER });
  if (!subs.length) return null;
  const send = transport ?? (await lib()).sendNotification;
  const payload = JSON.stringify(message);
  let any = false;
  for (const sub of subs) {
    const endpoint = openSecret(PURPOSE, sub.endpointEnc);
    const keys = openSecret(PURPOSE, sub.keysEnc);
    if (!endpoint || !keys || !isAllowedPushEndpoint(endpoint)) { await db.notificationPushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined); continue; }
    try {
      await send({ endpoint, keys: JSON.parse(keys) }, payload, {
        TTL: 24 * 3600,
        urgency: "normal",
        vapidDetails: { subject: config.settings.subject, publicKey: config.settings.publicKey, privateKey: config.secrets.privateKey },
      });
      any = true;
      await db.notificationPushSubscription.update({ where: { id: sub.id }, data: { failureCount: 0, lastSeenAt: new Date() } });
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410 || sub.failureCount + 1 >= MAX_FAILURES) await db.notificationPushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
      else await db.notificationPushSubscription.update({ where: { id: sub.id }, data: { failureCount: { increment: 1 } } });
    }
  }
  return { ok: any };
}
