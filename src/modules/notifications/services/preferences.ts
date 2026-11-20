import "server-only";

import { z } from "zod";

import { getDb } from "@/shared/db";
import { EXTERNAL_NOTIFICATION_CHANNELS, NOTIFICATION_CHANNELS, type ModuleNotifications, type NotificationChannel, type NotificationType } from "@/shared/notifications/define";

/**
 * N2a (#357) — tercihler. Uygulama içi kanal her zaman açıktır (kutu); tercihler yalnız dış kanalları yönetir.
 * Çözüm sırası: tür özel satırı → "*" (tüm türler) satırı → türün varsayılan kanalları.
 */
export const ANY_TYPE = "*";
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export type PreferenceRow = { typeKey: string; channel: string; enabled: boolean };

/** Saf: bir tür için etkin dış kanallar. */
export function resolveChannels(type: Pick<NotificationType, "defaultChannels">, typeKey: string, rows: readonly PreferenceRow[]): NotificationChannel[] {
  return EXTERNAL_NOTIFICATION_CHANNELS.filter((channel) => {
    const specific = rows.find((row) => row.typeKey === typeKey && row.channel === channel);
    if (specific) return specific.enabled;
    const any = rows.find((row) => row.typeKey === ANY_TYPE && row.channel === channel);
    if (any) return any.enabled;
    return type.defaultChannels.includes(channel);
  });
}

export const preferenceInputSchema = z.object({
  changes: z.array(z.object({
    typeKey: z.string().regex(/^(\*|[a-z][a-z0-9-]{0,39}\.[a-z][a-z0-9-]{1,48})$/),
    channel: z.enum(NOTIFICATION_CHANNELS).refine((channel) => channel !== "in_app", "IN_APP_ALWAYS_ON"),
    enabled: z.boolean(),
  }).strict()).min(1).max(200),
}).strict();

export const settingsInputSchema = z.object({
  quietFrom: z.string().regex(CLOCK).nullable(),
  quietTo: z.string().regex(CLOCK).nullable(),
  digestMode: z.enum(["instant", "daily"]),
  digestTime: z.string().regex(CLOCK),
}).strict().superRefine((value, ctx) => {
  if ((value.quietFrom === null) !== (value.quietTo === null)) ctx.addIssue({ code: "custom", path: ["quietTo"], message: "notifications.validation.quietPair" });
  else if (value.quietFrom !== null && value.quietFrom === value.quietTo) ctx.addIssue({ code: "custom", path: ["quietTo"], message: "notifications.validation.quietSame" });
});
export type NotificationSettingsInput = z.infer<typeof settingsInputSchema>;
export const DEFAULT_SETTINGS: NotificationSettingsInput = { quietFrom: null, quietTo: null, digestMode: "instant", digestTime: "07:30" };

export type PreferenceView = {
  typeKey: string;
  moduleKey: string;
  mandatory: boolean;
  defaultChannels: NotificationChannel[];
  channels: Record<NotificationChannel, boolean>;
};

/** Kullanıcının görebileceği türler için tercih tablosu (yetki süzmesi çağıranda: role göre). */
export async function getPreferenceTable(userId: string, registry: readonly ModuleNotifications[], visible: (type: NotificationType) => boolean): Promise<PreferenceView[]> {
  const rows = await getDb().notificationPreference.findMany({ where: { userId }, select: { typeKey: true, channel: true, enabled: true } });
  return registry.flatMap((entry) => entry.types.filter(visible).map((type) => {
    const typeKey = `${entry.module}.${type.key}`;
    const enabled = new Set<NotificationChannel>(["in_app", ...resolveChannels(type, typeKey, rows)]);
    return {
      typeKey,
      moduleKey: entry.module,
      mandatory: type.mandatory === true,
      defaultChannels: [...type.defaultChannels],
      channels: Object.fromEntries(NOTIFICATION_CHANNELS.map((channel) => [channel, enabled.has(channel)])) as Record<NotificationChannel, boolean>,
    };
  }));
}

/** Yalnız kayıtlı türler veya "*"; kullanıcıya yalıtılmış upsert. */
export async function savePreferences(userId: string, changes: z.infer<typeof preferenceInputSchema>["changes"], registry: readonly ModuleNotifications[]): Promise<number> {
  const known = new Set(registry.flatMap((entry) => entry.types.map((type) => `${entry.module}.${type.key}`)));
  const valid = changes.filter((change) => change.typeKey === ANY_TYPE || known.has(change.typeKey));
  const db = getDb();
  await db.$transaction(valid.map((change) => db.notificationPreference.upsert({
    where: { userId_typeKey_channel: { userId, typeKey: change.typeKey, channel: change.channel } },
    create: { userId, typeKey: change.typeKey, channel: change.channel, enabled: change.enabled },
    update: { enabled: change.enabled },
  })));
  return valid.length;
}

export async function getSettings(userId: string): Promise<NotificationSettingsInput> {
  const row = await getDb().notificationSettings.findUnique({ where: { userId } });
  if (!row) return DEFAULT_SETTINGS;
  const parsed = settingsInputSchema.safeParse({ quietFrom: row.quietFrom, quietTo: row.quietTo, digestMode: row.digestMode, digestTime: row.digestTime });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(userId: string, value: NotificationSettingsInput): Promise<void> {
  await getDb().notificationSettings.upsert({ where: { userId }, create: { userId, ...value }, update: value });
}

/** N6 (#363) geçişi: kullanıcının bu tür/kanal tercihi yoksa oluşturur (varsa dokunmaz). Dönüş: oluşturuldu mu. */
export async function ensurePreference(userId: string, typeKey: string, channel: NotificationChannel, enabled: boolean): Promise<boolean> {
  const db = getDb();
  if (await db.notificationPreference.findUnique({ where: { userId_typeKey_channel: { userId, typeKey, channel } }, select: { id: true } })) return false;
  await db.notificationPreference.create({ data: { userId, typeKey, channel, enabled } }).catch(() => undefined);
  return true;
}
