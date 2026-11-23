import "server-only";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import { fullTypeKey, isSafeNotificationHref, type ModuleNotifications, type NotificationType } from "@/shared/notifications/define";
import { openSecret, sealSecret } from "@/shared/security/secret-box";
import { emitNotificationUpdate } from "./stream-bus";

/**
 * N1a (#354) — çekirdek servis. Gönderim: tür kayıttan bulunur, parametre şeması strict doğrulanır, kaynak modül
 * kullanılabilir olmalı, her alıcının yetkisi ve etkinliği yeniden denetlenir; (alıcı, tür, ref) benzersiz.
 * Okuma: yetki ve modül durumu yeniden denetlenir; metin okunurken alıcının dilinde üretilir.
 */
const PURPOSE = "notification-params";
export const RETENTION_DAYS = 90;
export const MAX_SNOOZE_DAYS = 30;
const REF_KEY = /^[A-Za-z0-9:_.-]{1,160}$/;

export class NotificationError extends Error {}

export type Recipient = { id: string; role: Role; isActive: boolean };
export type NotifyDeps = {
  registry: readonly ModuleNotifications[];
  usableModules: () => Promise<string[]>;
  loadUser: (userId: string) => Promise<Recipient | null>;
  /** N1d (#374): kitle çözümü — etkin kullanıcılar (isteğe bağlı rol süzgeci). */
  listAudience?: (roles?: readonly string[]) => Promise<{ id: string; role: Role }[]>;
};

/** Kitle: belirli kişiler, türü görmeye yetkili herkes veya belirli roller (yine tür yetkisiyle süzülür). */
export type Audience = { allWithPermission: true } | { roles: readonly string[] };

async function defaultDeps(): Promise<NotifyDeps> {
  const [{ moduleNotificationRegistry }, { listUsableModuleKeys }, { getUserById, listActiveUsersForAudience }] = await Promise.all([
    import("@/notification-registry"),
    import("@/modules/system/automation"),
    import("@/modules/users/automation"),
  ]);
  return {
    registry: moduleNotificationRegistry,
    usableModules: listUsableModuleKeys,
    listAudience: (roles) => listActiveUsersForAudience(roles),
    loadUser: async (userId) => {
      const user = await getUserById(userId);
      return user ? { id: user.id, role: user.role, isActive: user.isActive } : null;
    },
  };
}

export function findType(registry: readonly ModuleNotifications[], typeKey: string): { moduleKey: string; type: NotificationType } | null {
  const dot = typeKey.indexOf(".");
  if (dot < 1) return null;
  const moduleKey = typeKey.slice(0, dot);
  const type = registry.find((entry) => entry.module === moduleKey)?.types.find((candidate) => candidate.key === typeKey.slice(dot + 1));
  return type ? { moduleKey, type } : null;
}

/** Bildirim gönder. Dönüş: yeni oluşturulan kayıt sayısı (yetkisiz/pasif alıcılar ve tekrarlar atlanır). */
export async function notify(input: { type: string; recipients?: readonly string[]; audience?: Audience; ref: string; params: unknown }, deps?: NotifyDeps): Promise<number> {
  const resolved = deps ?? (await defaultDeps());
  const found = findType(resolved.registry, input.type);
  if (!found) throw new NotificationError("NOTIFICATION_TYPE_UNKNOWN");
  if (!REF_KEY.test(input.ref)) throw new NotificationError("NOTIFICATION_REF_INVALID");
  const parsed = found.type.schema.safeParse(input.params);
  if (!parsed.success) throw new NotificationError("NOTIFICATION_PARAMS_INVALID");
  if (!(await resolved.usableModules()).includes(found.moduleKey)) return 0;
  if ((input.recipients ? 1 : 0) + (input.audience ? 1 : 0) !== 1) throw new NotificationError("NOTIFICATION_RECIPIENTS_INVALID");
  const permitted = (role: string) => can(role, found.type.permission.definition, found.type.permission.action);
  const recipients: string[] = [];
  if (input.audience) {
    if (!resolved.listAudience) throw new NotificationError("NOTIFICATION_AUDIENCE_UNAVAILABLE");
    const roles = "roles" in input.audience ? input.audience.roles : undefined;
    if (roles && !roles.length) return 0;
    for (const user of await resolved.listAudience(roles)) if (permitted(user.role)) recipients.push(user.id);
  } else {
    for (const userId of new Set(input.recipients)) {
      const user = await resolved.loadUser(userId);
      if (user?.isActive && permitted(user.role)) recipients.push(user.id);
    }
  }
  if (!recipients.length) return 0;
  const paramsEnc = sealSecret(PURPOSE, JSON.stringify(parsed.data ?? null));
  let created = 0;
  // Büyük kitlede parça parça yazım (tekrarlar benzersiz anahtarla atlanır).
  for (let index = 0; index < recipients.length; index += 500) {
    const result = await getDb().notification.createMany({
    data: recipients.slice(index, index + 500).map((userId) => ({ userId, typeKey: fullTypeKey(found.moduleKey, found.type.key), moduleKey: found.moduleKey, severity: found.type.severity, paramsEnc, refKey: input.ref })),
    skipDuplicates: true,
    });
    created += result.count;
  }
  if (created > 0) {
    for (const userId of recipients) emitNotificationUpdate(userId);
  }
  return created;
}

export type NotificationView = {
  id: string;
  moduleKey: string;
  typeKey: string;
  severity: "info" | "warning" | "danger";
  title: string;
  body: string | null;
  href: string | null;
  createdAt: string;
  read: boolean;
};

export type Translator = (moduleKey: string) => Promise<(key: string, values?: Record<string, string | number>) => string>;

const visibleWhere = (userId: string, now: Date) => ({
  userId,
  dismissedAt: null,
  OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
});

/** Yalnız kendi bildirimleri; yetkisi kalkan veya modülü kapanan türler gösterilmez. */
export async function listNotifications(
  user: { id: string; role: Role },
  options: { unreadOnly?: boolean; module?: string; limit?: number; before?: Date },
  translate: Translator,
  deps?: NotifyDeps,
  now = new Date(),
): Promise<NotificationView[]> {
  const resolved = deps ?? (await defaultDeps());
  const usable = new Set(await resolved.usableModules());
  const rows = await getDb().notification.findMany({
    where: {
      ...visibleWhere(user.id, now),
      ...(options.unreadOnly ? { readAt: null } : {}),
      ...(options.module ? { moduleKey: options.module } : {}),
      ...(options.before ? { createdAt: { lt: options.before } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(options.limit ?? 30, 1), 100),
  });
  const out: NotificationView[] = [];
  for (const row of rows) {
    const found = findType(resolved.registry, row.typeKey);
    if (!found || !usable.has(found.moduleKey) || !can(user.role, found.type.permission.definition, found.type.permission.action)) continue;
    const plain = row.paramsEnc ? openSecret(PURPOSE, row.paramsEnc) : null;
    const params = found.type.schema.safeParse(plain ? JSON.parse(plain) : null);
    if (!params.success) continue;
    const t = await translate(found.moduleKey);
    const values = Object.fromEntries(Object.entries((params.data ?? {}) as Record<string, unknown>).filter(([, value]) => typeof value === "string" || typeof value === "number")) as Record<string, string | number>;
    const href = found.type.href(params.data);
    out.push({
      id: row.id,
      moduleKey: found.moduleKey,
      typeKey: row.typeKey,
      severity: row.severity as NotificationView["severity"],
      title: t(found.type.titleKey, values),
      body: found.type.bodyKey ? t(found.type.bodyKey, values) : null,
      href: isSafeNotificationHref(href) ? href : null,
      createdAt: row.createdAt.toISOString(),
      read: row.readAt !== null,
    });
  }
  return out;
}

/** Rozet: görünür okunmamış sayısı (yetki süzmesi listelemede; burada hızlı sayım, en fazla 100). */
export async function unreadCount(userId: string, now = new Date()): Promise<number> {
  return Math.min(await getDb().notification.count({ where: { ...visibleWhere(userId, now), readAt: null } }), 100);
}

export async function markRead(userId: string, ids: readonly string[], now = new Date()): Promise<number> {
  if (!ids.length) return 0;
  return (await getDb().notification.updateMany({ where: { userId, id: { in: [...ids].slice(0, 100) }, readAt: null }, data: { readAt: now } })).count;
}

export async function markAllRead(userId: string, now = new Date()): Promise<number> {
  return (await getDb().notification.updateMany({ where: { userId, readAt: null }, data: { readAt: now } })).count;
}

export async function snooze(userId: string, id: string, until: Date, now = new Date()): Promise<void> {
  if (until <= now || until.getTime() - now.getTime() > MAX_SNOOZE_DAYS * 86_400_000) throw new NotificationError("notifications.errors.snoozeRange");
  const result = await getDb().notification.updateMany({ where: { id, userId, dismissedAt: null }, data: { snoozedUntil: until } });
  if (result.count !== 1) throw new NotificationError("notifications.errors.notFound");
}

export async function dismiss(userId: string, id: string, now = new Date()): Promise<void> {
  const result = await getDb().notification.updateMany({ where: { id, userId, dismissedAt: null }, data: { dismissedAt: now, readAt: now } });
  if (result.count !== 1) throw new NotificationError("notifications.errors.notFound");
}

/** Saklama: 90 günden eski bildirimler silinir. */
export async function purgeExpired(now = new Date()): Promise<number> {
  return (await getDb().notification.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - RETENTION_DAYS * 86_400_000) } } })).count;
}
