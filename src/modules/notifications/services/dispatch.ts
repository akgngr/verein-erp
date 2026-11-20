import "server-only";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import { isSafeNotificationHref, type ModuleNotifications, safeExternalText } from "@/shared/notifications/define";
import { openSecret } from "@/shared/security/secret-box";

import { findType } from "./inbox";
import { type PreferenceRow, resolveChannels } from "./preferences";

/**
 * N2a (#357) — dış kanal dağıtımı (şimdilik e-posta). Mevcut pg-boss zamanlayıcısıyla birkaç dakikada bir çalışır.
 * Kurallar: yalnız okunmamış/kapatılmamış bildirimler; yetki ve modül durumu yeniden denetlenir; sessiz saatte
 * gönderim yok (sonraki çalışmada); (kullanıcı, kanal, bildirim) claim'i ile çift gönderim yok; sınırlı yeniden deneme;
 * e-posta gövdesi yalnız genel metin + uygulama bağlantısı (başlık/parametre yok).
 */
export const DISPATCH_LIMITS = { windowHours: 48, perUserPerRun: 10, attempts: 3, usersPerRun: 500 } as const;
const PARAMS_PURPOSE = "notification-params";
const TIME_ZONE = "Europe/Berlin";

export function berlinClock(now: Date): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}
const clock = (value: string | null) => (value && /^\d{2}:\d{2}$/.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : null);
export function isQuiet(minutes: number, from: string | null, to: string | null): boolean {
  const a = clock(from);
  const b = clock(to);
  if (a === null || b === null || a === b) return false;
  return a < b ? minutes >= a && minutes < b : minutes >= a || minutes < b;
}

export type DispatchUser = { id: string; role: Role; isActive: boolean; email: string | null };
export type MailMessage = { to: string; subject: string; text: string; context: { module: string; reference?: string } };
export type DispatchDeps = {
  registry: readonly ModuleNotifications[];
  usableModules: () => Promise<string[]>;
  loadUser: (userId: string) => Promise<DispatchUser | null>;
  isMailConfigured: () => Promise<boolean>;
  sendMail: (message: MailMessage) => Promise<{ ok: boolean; logId?: string }>;
  appUrl: string | undefined;
  locale: "tr" | "de";
  /** N3a (#359): Web Push (yapılandırılmamışsa yok sayılır). */
  webPush?: { isAvailable: () => Promise<boolean>; send: (userId: string, message: { title: string; body: string; url: string }) => Promise<{ ok: boolean } | null> };
  /** N4 (#361): Telegram (yapılandırılmamışsa yok sayılır). */
  telegram?: { isAvailable: () => Promise<boolean>; chatFor: (userId: string) => Promise<string | null>; send: (chatId: string, text: string) => Promise<{ ok: boolean; providerId?: string }> };
};
export type DispatchResult = { users: number; sent: number; skipped: number; failed: number; digests: number };

/** Yalnız genel metin; başlık, ad, tutar yok. */
export function emailText(locale: "tr" | "de", count: number, link: string): { subject: string; text: string } {
  const n = Number.isSafeInteger(count) && count > 0 ? count : 1;
  return locale === "de"
    ? { subject: n === 1 ? "Verein ERP: neue Benachrichtigung" : `Verein ERP: ${n} neue Benachrichtigungen`, text: `${n === 1 ? "Sie haben eine neue Benachrichtigung" : `Sie haben ${n} neue Benachrichtigungen`} in Verein ERP.\n\nÖffnen: ${link}` }
    : { subject: n === 1 ? "Verein ERP: yeni bildirim" : `Verein ERP: ${n} yeni bildirim`, text: `Verein ERP'de ${n === 1 ? "yeni bir bildiriminiz" : `${n} yeni bildiriminiz`} var.\n\nAçın: ${link}` };
}

function appLink(appUrl: string, path: string | null): string | null {
  try {
    const base = new URL(appUrl);
    if (base.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base.hostname)) return null;
    return new URL(path && isSafeNotificationHref(path) ? path : "/", base.origin).toString();
  } catch {
    return null;
  }
}

/** Claim: yeni satır ya da deneme hakkı kalan başarısız satır. true = bu çalışma gönderir. */
async function claim(userId: string, channel: string, dedupeKey: string): Promise<string | null> {
  const db = getDb();
  try {
    return (await db.notificationDelivery.create({ data: { userId, channel, dedupeKey, status: "PENDING", attempts: 1 }, select: { id: true } })).id;
  } catch {
    const retried = await db.notificationDelivery.updateMany({ where: { userId, channel, dedupeKey, status: "FAILED", attempts: { lt: DISPATCH_LIMITS.attempts } }, data: { status: "PENDING", attempts: { increment: 1 } } });
    if (retried.count !== 1) return null;
    return (await db.notificationDelivery.findUnique({ where: { userId_channel_dedupeKey: { userId, channel, dedupeKey } }, select: { id: true } }))?.id ?? null;
  }
}

async function finish(id: string, ok: boolean, providerId?: string) {
  await getDb().notificationDelivery.update({ where: { id }, data: ok ? { status: "SENT", providerId: providerId?.slice(0, 200) ?? null, errorCode: null } : { status: "FAILED", errorCode: "CHANNEL_SEND_FAILED" } });
}

type Sender = (user: DispatchUser, count: number, link: string, reference: string, text?: string | null) => Promise<{ ok: boolean; providerId?: string } | null>;

/** Tür özel metin varsa onu (yalnız kişisel olmayan değerler; sözleşme), yoksa genel metni kullanır. */
function messageFor(locale: "tr" | "de", count: number, link: string, text?: string | null): { subject: string; text: string } {
  const generic = emailText(locale, count, link);
  if (!text) return generic;
  return { subject: `Verein ERP: ${text}`, text: `${text}\n\n${locale === "de" ? "Öffnen" : "Açın"}: ${link}` };
}

export async function runDispatch(now: Date, deps: DispatchDeps): Promise<DispatchResult> {
  const result: DispatchResult = { users: 0, sent: 0, skipped: 0, failed: 0, digests: 0 };
  if (!deps.appUrl || !appLink(deps.appUrl, "/")) return result;
  // Kullanılabilir dış kanallar ve gönderenler (kanal başına; null = bu kullanıcıya bu kanaldan gönderilemez).
  const senders = new Map<string, Sender>();
  if (await deps.isMailConfigured()) {
    senders.set("email", async (user, count, link, reference, text) => {
      if (!user.email) return null;
      const sent = await deps.sendMail({ to: user.email, ...messageFor(deps.locale, count, link, text), context: { module: "notifications", reference } }).catch(() => ({ ok: false as const }));
      return { ok: sent.ok, providerId: "logId" in sent ? sent.logId : undefined };
    });
  }
  const telegram = deps.telegram;
  if (telegram && (await telegram.isAvailable().catch(() => false))) {
    senders.set("telegram", async (user, count, link, _reference, text) => {
      const chatId = await telegram.chatFor(user.id);
      if (!chatId) return null;
      const message = messageFor(deps.locale, count, link, text);
      return telegram.send(chatId, `${message.subject}\n${link}`).catch(() => ({ ok: false }));
    });
  }
  const webPush = deps.webPush;
  if (webPush && (await webPush.isAvailable().catch(() => false))) {
    senders.set("web_push", async (user, count, link, _reference, text) => {
      const message = messageFor(deps.locale, count, link, text);
      return webPush.send(user.id, { title: message.subject, body: message.subject, url: link }).catch(() => ({ ok: false }));
    });
  }
  if (!senders.size) return result;
  const db = getDb();
  const since = new Date(now.getTime() - DISPATCH_LIMITS.windowHours * 3_600_000);
  const pending = await db.notification.findMany({
    where: { createdAt: { gte: since }, readAt: null, dismissedAt: null, OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }] },
    select: { id: true, userId: true, typeKey: true, paramsEnc: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 5000,
  });
  const byUser = new Map<string, typeof pending>();
  for (const row of pending) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row]);
  const usable = new Set(await deps.usableModules());
  const time = berlinClock(now);

  const deliver = async (user: DispatchUser, channel: string, dedupeKey: string, count: number, link: string, text?: string | null): Promise<boolean> => {
    const send = senders.get(channel);
    if (!send) return false;
    const id = await claim(user.id, channel, dedupeKey);
    if (!id) return false;
    const sent: { ok: boolean; providerId?: string } | null = await send(user, count, link, dedupeKey, text).catch(() => ({ ok: false }));
    if (sent === null) {
      // Bu kanal bu kullanıcı için bağlı değil: claim geri alınır (sonra bağlanırsa gönderilebilir).
      await db.notificationDelivery.delete({ where: { id } }).catch(() => undefined);
      return false;
    }
    await finish(id, sent.ok, sent.providerId);
    if (sent.ok) result.sent += 1; else result.failed += 1;
    return sent.ok;
  };

  for (const [userId, rows] of [...byUser].slice(0, DISPATCH_LIMITS.usersPerRun)) {
    result.users += 1;
    try {
      const user = await deps.loadUser(userId);
      if (!user?.isActive) { result.skipped += rows.length; continue; }
      const [settings, prefs] = await Promise.all([
        db.notificationSettings.findUnique({ where: { userId } }),
        db.notificationPreference.findMany({ where: { userId }, select: { typeKey: true, channel: true, enabled: true } }) as Promise<PreferenceRow[]>,
      ]);
      if (isQuiet(time.minutes, settings?.quietFrom ?? null, settings?.quietTo ?? null)) { result.skipped += rows.length; continue; }
      // Kanal açık ve hâlâ yetkili olunan bildirimler.
      const eligible = rows.flatMap((row) => {
        const found = findType(deps.registry, row.typeKey);
        if (!found || !usable.has(found.moduleKey)) return [];
        if (!can(user.role, found.type.permission.definition, found.type.permission.action)) return [];
        const channels = resolveChannels(found.type, row.typeKey, prefs).filter((channel) => senders.has(channel));
        if (!channels.length) return [];
        const plain = row.paramsEnc ? openSecret(PARAMS_PURPOSE, row.paramsEnc) : null;
        const params = found.type.schema.safeParse(plain ? JSON.parse(plain) : null);
        if (!params.success) return [];
        let text: string | null = null;
        try { text = found.type.externalText ? safeExternalText(found.type.externalText(params.data, deps.locale)) : null; } catch { text = null; }
        return [{ ...row, channels, href: found.type.href(params.data), text }];
      });
      if (!eligible.length) continue;

      if ((settings?.digestMode ?? "instant") === "daily") {
        const at = clock(settings?.digestTime ?? "07:30") ?? 450;
        if (time.minutes < at) continue;
        for (const channel of new Set(eligible.flatMap((row) => row.channels))) {
          const count = eligible.filter((row) => row.channels.includes(channel)).length;
          if (await deliver(user, channel, `digest:${time.date}`, count, appLink(deps.appUrl, "/")!)) result.digests += 1;
        }
        continue;
      }

      for (const row of eligible.slice(0, DISPATCH_LIMITS.perUserPerRun)) {
        for (const channel of row.channels) await deliver(user, channel, row.id, 1, appLink(deps.appUrl, row.href)!, row.text);
      }
    } catch {
      // Bir kullanıcının hatası diğerlerini durdurmaz; içerik günlüğe yazılmaz.
      console.error("[notifications] DISPATCH_USER_FAILED");
      result.failed += 1;
    }
  }
  return result;
}

export async function defaultDispatchDeps(): Promise<DispatchDeps> {
  const [{ moduleNotificationRegistry }, { listUsableModuleKeys }, { getUserById }, mail, { getEnv }] = await Promise.all([
    import("@/notification-registry"),
    import("@/modules/system/automation"),
    import("@/modules/users/automation"),
    import("@/modules/mail/automation"),
    import("@/shared/env"),
  ]);
  const env = getEnv();
  return {
    registry: moduleNotificationRegistry,
    usableModules: listUsableModuleKeys,
    loadUser: async (userId) => {
      const user = await getUserById(userId);
      return user ? { id: user.id, role: user.role, isActive: user.isActive, email: user.email } : null;
    },
    isMailConfigured: mail.isMailConfigured,
    sendMail: async (message) => {
      const sent = await mail.sendMail(message);
      return sent.ok ? { ok: true, logId: sent.logId } : { ok: false, logId: sent.logId };
    },
    appUrl: env.APP_URL,
    locale: env.DOCUMENT_LANGUAGE,
    webPush: {
      isAvailable: async () => Boolean(await (await import("./web-push")).publicKey()),
      send: async (userId, message) => (await import("./web-push")).sendPush(userId, message),
    },
    telegram: {
      isAvailable: async () => {
        const { getChannelConfig } = await import("./channel-config");
        const config = await getChannelConfig("telegram");
        return config.enabled && Boolean(config.secrets.botToken);
      },
      chatFor: async (userId) => (await import("./telegram")).telegramChatFor(userId),
      send: async (chatId, text) => (await import("./telegram")).sendTelegram(chatId, text),
    },
  };
}
