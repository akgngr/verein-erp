import "server-only";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import { isSafeNotificationHref, type ModuleNotifications } from "@/shared/notifications/define";
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
  await getDb().notificationDelivery.update({ where: { id }, data: ok ? { status: "SENT", providerId: providerId?.slice(0, 200) ?? null, errorCode: null } : { status: "FAILED", errorCode: "MAIL_SEND_FAILED" } });
}

export async function runDispatch(now: Date, deps: DispatchDeps): Promise<DispatchResult> {
  const result: DispatchResult = { users: 0, sent: 0, skipped: 0, failed: 0, digests: 0 };
  if (!deps.appUrl || !appLink(deps.appUrl, "/") || !(await deps.isMailConfigured())) return result;
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

  for (const [userId, rows] of [...byUser].slice(0, DISPATCH_LIMITS.usersPerRun)) {
    result.users += 1;
    try {
      const user = await deps.loadUser(userId);
      if (!user?.isActive || !user.email) { result.skipped += rows.length; continue; }
      const [settings, prefs] = await Promise.all([
        db.notificationSettings.findUnique({ where: { userId } }),
        db.notificationPreference.findMany({ where: { userId }, select: { typeKey: true, channel: true, enabled: true } }) as Promise<PreferenceRow[]>,
      ]);
      if (isQuiet(time.minutes, settings?.quietFrom ?? null, settings?.quietTo ?? null)) { result.skipped += rows.length; continue; }
      // E-posta kanalı açık ve hâlâ yetkili olunan bildirimler.
      const eligible = rows.flatMap((row) => {
        const found = findType(deps.registry, row.typeKey);
        if (!found || !usable.has(found.moduleKey)) return [];
        if (!can(user.role, found.type.permission.definition, found.type.permission.action)) return [];
        if (!resolveChannels(found.type, row.typeKey, prefs).includes("email")) return [];
        const plain = row.paramsEnc ? openSecret(PARAMS_PURPOSE, row.paramsEnc) : null;
        const params = found.type.schema.safeParse(plain ? JSON.parse(plain) : null);
        return params.success ? [{ ...row, href: found.type.href(params.data) }] : [];
      });
      if (!eligible.length) continue;

      if ((settings?.digestMode ?? "instant") === "daily") {
        const at = clock(settings?.digestTime ?? "07:30") ?? 450;
        if (time.minutes < at) continue;
        const id = await claim(userId, "email", `digest:${time.date}`);
        if (!id) continue;
        const message = emailText(deps.locale, eligible.length, appLink(deps.appUrl, "/")!);
        const sent = await deps.sendMail({ to: user.email, ...message, context: { module: "notifications", reference: `digest:${time.date}` } }).catch(() => ({ ok: false as const }));
        await finish(id, sent.ok, "logId" in sent ? sent.logId : undefined);
        if (sent.ok) { result.digests += 1; result.sent += 1; } else result.failed += 1;
        continue;
      }

      for (const row of eligible.slice(0, DISPATCH_LIMITS.perUserPerRun)) {
        const id = await claim(userId, "email", row.id);
        if (!id) continue;
        const message = emailText(deps.locale, 1, appLink(deps.appUrl, row.href)!);
        const sent = await deps.sendMail({ to: user.email, ...message, context: { module: "notifications", reference: `notification:${row.id}` } }).catch(() => ({ ok: false as const }));
        await finish(id, sent.ok, "logId" in sent ? sent.logId : undefined);
        if (sent.ok) result.sent += 1; else result.failed += 1;
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
  };
}
