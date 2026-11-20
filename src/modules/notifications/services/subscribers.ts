import "server-only";

import { getDb } from "@/shared/db";

import { revokeTelegramLink, telegramLinkStatus } from "./telegram";

/**
 * N8a (#375) — yönetici abone görünümü. Kullanıcı başına kanal DURUMU; adres, sohbet kimliği veya uç nokta yok.
 * E-posta: kullanıcının genel ("*") tercihi; yoksa "default" (türlerin varsayılanı). Telegram: bağlı/bekliyor/yok.
 * Web Push: cihaz sayısı. Kaldırma: Telegram bağı veya tüm push abonelikleri (denetim çağıranda).
 */
export type SubscriberChannelState = {
  email: "on" | "off" | "default";
  telegram: "linked" | "pending" | "none";
  webPushDevices: number;
};
export type SubscriberRow = { userId: string; name: string; email: string; role: string; isActive: boolean; channels: SubscriberChannelState };
export type SubscriberSummary = { users: number; emailOff: number; telegramLinked: number; webPushUsers: number; webPushDevices: number };

export type DirectoryLoader = (options: { q?: string; skip: number; take: number; ids?: readonly string[] }) => Promise<{ rows: { id: string; name: string; email: string; role: string; isActive: boolean }[]; total: number }>;

async function defaultDirectory(): Promise<DirectoryLoader> {
  return (await import("@/modules/users/automation")).listUserDirectory;
}

export async function channelStates(userIds: readonly string[], now = new Date()): Promise<Map<string, SubscriberChannelState>> {
  const db = getDb();
  const [prefs, pushCounts] = await Promise.all([
    db.notificationPreference.findMany({ where: { userId: { in: [...userIds] }, typeKey: "*", channel: "email" }, select: { userId: true, enabled: true } }),
    db.notificationPushSubscription.groupBy({ by: ["userId"], where: { userId: { in: [...userIds] } }, _count: { _all: true } }),
  ]);
  const email = new Map(prefs.map((row) => [row.userId, row.enabled]));
  const push = new Map(pushCounts.map((row) => [row.userId, row._count._all]));
  const out = new Map<string, SubscriberChannelState>();
  for (const userId of userIds) {
    out.set(userId, {
      email: email.has(userId) ? (email.get(userId) ? "on" : "off") : "default",
      telegram: await telegramLinkStatus(userId, now),
      webPushDevices: push.get(userId) ?? 0,
    });
  }
  return out;
}

export async function listSubscribers(options: { q?: string; channel?: "telegram" | "web_push" | "email_off"; page: number; pageSize: number }, directory?: DirectoryLoader): Promise<{ rows: SubscriberRow[]; total: number; summary: SubscriberSummary }> {
  const load = directory ?? (await defaultDirectory());
  const db = getDb();
  const pageSize = Math.min(Math.max(options.pageSize, 1), 100);
  // Kanal süzgeci: önce o kanala sahip kullanıcı kimlikleri.
  let ids: string[] | undefined;
  if (options.channel === "telegram") ids = (await db.notificationChannelLink.findMany({ where: { channel: "telegram", verifiedAt: { not: null }, revokedAt: null }, select: { userId: true } })).map((row) => row.userId);
  if (options.channel === "web_push") ids = [...new Set((await db.notificationPushSubscription.findMany({ select: { userId: true } })).map((row) => row.userId))];
  if (options.channel === "email_off") ids = (await db.notificationPreference.findMany({ where: { typeKey: "*", channel: "email", enabled: false }, select: { userId: true } })).map((row) => row.userId);
  const page = await load({ q: options.q, skip: (Math.max(options.page, 1) - 1) * pageSize, take: pageSize, ids });
  const states = await channelStates(page.rows.map((row) => row.id));
  const [emailOff, telegramLinked, pushUsers, pushDevices, users] = await Promise.all([
    db.notificationPreference.count({ where: { typeKey: "*", channel: "email", enabled: false } }),
    db.notificationChannelLink.count({ where: { channel: "telegram", verifiedAt: { not: null }, revokedAt: null } }),
    db.notificationPushSubscription.groupBy({ by: ["userId"] }).then((rows) => rows.length),
    db.notificationPushSubscription.count(),
    load({ skip: 0, take: 1 }).then((result) => result.total),
  ]);
  return {
    rows: page.rows.map((row) => ({ userId: row.id, name: row.name, email: row.email, role: row.role, isActive: row.isActive, channels: states.get(row.id)! })),
    total: page.total,
    summary: { users, emailOff, telegramLinked, webPushUsers: pushUsers, webPushDevices: pushDevices },
  };
}

/** Yönetici: kullanıcının Telegram bağını veya tüm push aboneliklerini kaldırır. Dönüş: kaldırılan kayıt sayısı. */
export async function removeSubscriberChannel(userId: string, channel: "telegram" | "web_push"): Promise<number> {
  if (channel === "telegram") {
    const before = await telegramLinkStatus(userId);
    await revokeTelegramLink(userId);
    return before === "none" ? 0 : 1;
  }
  return (await getDb().notificationPushSubscription.deleteMany({ where: { userId } })).count;
}
