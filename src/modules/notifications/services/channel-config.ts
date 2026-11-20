import "server-only";

import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

/**
 * Kurum düzeyi kanal ayarları (ADR 0006): sağlayıcı sırları veritabanında şifreli, arayüze geri gösterilmez.
 * Yalnız `update` yetkili yönetici değiştirir; değişiklik denetime sır içermeden yazılır.
 */
const PURPOSE = "notification-channel-secrets";

export type ChannelConfig = { enabled: boolean; secrets: Record<string, string>; settings: Record<string, string> };

export async function getChannelConfig(channel: string): Promise<ChannelConfig> {
  const row = await getDb().notificationChannelConfig.findUnique({ where: { channel } });
  const plain = row?.secretsEnc ? openSecret(PURPOSE, row.secretsEnc) : null;
  const secrets = plain ? (JSON.parse(plain) as Record<string, string>) : {};
  const settings = row?.settings && typeof row.settings === "object" ? (row.settings as Record<string, string>) : {};
  return { enabled: row?.enabled === true, secrets, settings };
}

/** Boş bırakılan sır alanı mevcut değeri korur; `null` siler. */
export async function saveChannelConfig(
  channel: string,
  input: { enabled: boolean; secrets?: Record<string, string | null>; settings?: Record<string, string> },
  actorId: string,
): Promise<ChannelConfig> {
  const current = await getChannelConfig(channel);
  const secrets = { ...current.secrets };
  for (const [key, value] of Object.entries(input.secrets ?? {})) {
    if (value === null) delete secrets[key];
    else if (value.trim()) secrets[key] = value.trim();
  }
  const settings = { ...current.settings, ...(input.settings ?? {}) };
  const data = { enabled: input.enabled, secretsEnc: Object.keys(secrets).length ? sealSecret(PURPOSE, JSON.stringify(secrets)) : null, settings, updatedById: actorId };
  await getDb().notificationChannelConfig.upsert({ where: { channel }, create: { channel, ...data }, update: data });
  return { enabled: input.enabled, secrets, settings };
}

export type ChannelConfigView = { channel: string; enabled: boolean; secretKeys: string[]; settings: Record<string, string> };

/** Arayüz projeksiyonu: sır değerleri yok, yalnız hangi sırların kayıtlı olduğu. */
export async function listChannelConfigs(channels: readonly string[]): Promise<ChannelConfigView[]> {
  return Promise.all(channels.map(async (channel) => {
    const config = await getChannelConfig(channel);
    return { channel, enabled: config.enabled, secretKeys: Object.keys(config.secrets).sort(), settings: config.settings };
  }));
}
