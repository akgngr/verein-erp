import "server-only";

import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { AI_PROVIDER_IDS, DEFAULT_MODELS, isReady, type AiProviderId, type ProviderSettings } from "./registry";

const PURPOSE = "ai-provider-key";

/** Sağlayıcı ayarı (anahtar çözülmüş hâlde, YALNIZCA sunucuda kullanılır). */
export async function getProviderSettings(id: AiProviderId): Promise<ProviderSettings> {
  const row = await getDb().aiProviderCredential.findUnique({ where: { provider: id } });
  return {
    id,
    model: row?.model || DEFAULT_MODELS[id] || null,
    apiKey: row?.apiKeyEnc ? openSecret(PURPOSE, row.apiKeyEnc) : null,
    baseURL: row?.baseUrl || null,
  };
}

export async function isProviderReady(id: AiProviderId): Promise<boolean> {
  return isReady(await getProviderSettings(id));
}

/** Ayarlar ekranı için durum: anahtarın kendisi DEĞİL, yalnızca kayıtlı olup olmadığı. */
export async function listProviderStatus(): Promise<{ id: AiProviderId; hasKey: boolean; keyUnreadable: boolean; model: string | null; baseUrl: string | null; ready: boolean }[]> {
  const rows = await getDb().aiProviderCredential.findMany();
  const byId = new Map(rows.map((row) => [row.provider, row]));
  return Promise.all(
    AI_PROVIDER_IDS.map(async (id) => {
      const row = byId.get(id);
      const settings = await getProviderSettings(id);
      return {
        id,
        hasKey: Boolean(row?.apiKeyEnc),
        keyUnreadable: Boolean(row?.apiKeyEnc) && !settings.apiKey,
        model: row?.model ?? null,
        baseUrl: row?.baseUrl ?? null,
        ready: isReady(settings),
      };
    }),
  );
}

/** apiKey: undefined → mevcut anahtar korunur; clearKey → silinir; aksi hâlde şifrelenip yazılır. */
export async function saveProviderCredential(id: AiProviderId, input: { apiKey?: string; clearKey?: boolean; model: string | null; baseUrl: string | null }): Promise<void> {
  const keyUpdate = input.clearKey ? { apiKeyEnc: null } : input.apiKey ? { apiKeyEnc: sealSecret(PURPOSE, input.apiKey) } : {};
  await getDb().aiProviderCredential.upsert({
    where: { provider: id },
    create: { provider: id, model: input.model, baseUrl: input.baseUrl, ...keyUpdate },
    update: { model: input.model, baseUrl: input.baseUrl, ...keyUpdate },
  });
}
