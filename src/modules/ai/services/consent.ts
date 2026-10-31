import "server-only";

import { getDb } from "@/shared/db";

import { AI_PROVIDER_IDS, isProviderReady, type AiProviderId } from "./providers";

/** Bilgilendirme metni değişirse sürüm artırılır; eski rızalar geçersiz sayılır ve yeniden istenir. */
export const AI_CONSENT_VERSION = 1;

const isProviderId = (value: string | null | undefined): value is AiProviderId =>
  Boolean(value) && (AI_PROVIDER_IDS as readonly string[]).includes(value as string);

/**
 * Etkin sağlayıcı: yöneticinin seçtiği (hazırsa). Seçim yoksa izinli listedeki sıraya göre
 * hazır olan ilki — sıra bilinçli olarak en korumalıdan başlar (yerel → Mistral → …).
 */
export async function getActiveProvider(): Promise<AiProviderId | null> {
  const row = await getDb().aiSettings.findUnique({ where: { id: "singleton" } });
  if (isProviderId(row?.provider)) return (await isProviderReady(row.provider)) ? row.provider : null;
  for (const id of AI_PROVIDER_IDS) {
    if (await isProviderReady(id)) return id;
  }
  return null;
}

export async function setActiveProvider(provider: AiProviderId): Promise<void> {
  await getDb().aiSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", provider }, update: { provider } });
}

/** Rıza yalnızca güncel sürüm VE şu anki sağlayıcı için geçerlidir. */
export async function hasAiConsent(userId: string): Promise<boolean> {
  const [row, provider] = await Promise.all([getDb().aiUserConsent.findUnique({ where: { userId } }), getActiveProvider()]);
  return Boolean(provider) && row?.version === AI_CONSENT_VERSION && row.provider === provider;
}

export async function giveAiConsent(userId: string, provider: AiProviderId): Promise<void> {
  await getDb().aiUserConsent.upsert({
    where: { userId },
    create: { userId, version: AI_CONSENT_VERSION, provider },
    update: { version: AI_CONSENT_VERSION, provider, acceptedAt: new Date() },
  });
}

export async function revokeAiConsent(userId: string): Promise<void> {
  await getDb().aiUserConsent.deleteMany({ where: { userId } });
}

/** Kullanılabilir bir sağlayıcı var mı (anahtar değeri asla istemciye gönderilmez). */
export async function isAiConfigured(): Promise<boolean> {
  return (await getActiveProvider()) !== null;
}
