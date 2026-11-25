import "server-only";

import { getDb } from "@/shared/db";

/**
 * #583: Gizlilik ön ayarının yapay zekâ sağlayıcı politikası. `applyPrivacyPreset` yazar; `ai` modülü sağlayıcı
 * seçiminde ve her çalıştırmada okur (`getActiveProvider`). Önceden ayar yazılıyor ama hiç okunmuyordu, yani
 * "Yalnız yerel" ön ayarına rağmen bulut sağlayıcıya veri gidebiliyordu.
 */
export const PRIVACY_AI_ALLOWED_SETTING_KEY = "privacy.ai_allowed_providers";

/**
 * `null`: ön ayar uygulanmamış, kısıt yok. Bozuk değer: boş liste (fail closed, hiçbir sağlayıcı izinli değil).
 */
export function parseAllowedAiProviders(value: string | null | undefined): string[] | null {
  if (value === null || value === undefined) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function getAllowedAiProviders(): Promise<string[] | null> {
  const row = await getDb().systemSetting.findUnique({ where: { key: PRIVACY_AI_ALLOWED_SETTING_KEY }, select: { value: true } });
  return parseAllowedAiProviders(row?.value);
}

export function isAiProviderAllowed(allowed: string[] | null, provider: string): boolean {
  return allowed === null || allowed.includes(provider);
}
