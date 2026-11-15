import "server-only";

import { getDb } from "@/shared/db";

/**
 * Bulut veri politikası (docs/architecture/ai-cloud-pseudonym-relay.md).
 * OFF: bulut kapalı (yalnız yerel model) · INTENTS: yalnız hazır sorular · SCREENED: denetimli serbest metin.
 * Takma adlı kişi düzeyi çıktılar yalnız SCREENED ile anlamlıdır ve varsayılan kapalıdır.
 */
export const CLOUD_TEXT_MODES = ["OFF", "INTENTS", "SCREENED"] as const;
export type CloudTextMode = (typeof CLOUD_TEXT_MODES)[number];
export type CloudSettings = { textMode: CloudTextMode; pseudonymousRecords: boolean };

export const DEFAULT_CLOUD_SETTINGS: CloudSettings = { textMode: "INTENTS", pseudonymousRecords: false };

export function normalizeCloudSettings(row: { cloudTextMode?: string | null; cloudPseudonymousRecords?: boolean | null } | null): CloudSettings {
  const textMode = (CLOUD_TEXT_MODES as readonly string[]).includes(row?.cloudTextMode ?? "") ? (row!.cloudTextMode as CloudTextMode) : DEFAULT_CLOUD_SETTINGS.textMode;
  return { textMode, pseudonymousRecords: textMode === "SCREENED" && Boolean(row?.cloudPseudonymousRecords) };
}

export async function getCloudSettings(): Promise<CloudSettings> {
  const row = await getDb().aiSettings.findUnique({ where: { id: "singleton" }, select: { cloudTextMode: true, cloudPseudonymousRecords: true } });
  return normalizeCloudSettings(row);
}

export async function setCloudSettings(settings: CloudSettings): Promise<void> {
  const data = { cloudTextMode: settings.textMode, cloudPseudonymousRecords: settings.textMode === "SCREENED" && settings.pseudonymousRecords };
  // provider "" = henüz seçilmedi; getActiveProvider hazır ilk sağlayıcıya düşer.
  await getDb().aiSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", provider: "", ...data }, update: data });
}
