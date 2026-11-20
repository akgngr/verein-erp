import "server-only";

import { getOrganizationProfile } from "@/modules/organization/automation";
import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { loadLicenseIssuers } from "@/shared/licensing/issuers";
import { evaluateLicense, statusHasFeature, type LicenseInstance, type LicenseStatus } from "@/shared/licensing/license";

/**
 * Lisans deposu (RFC-002, #419). Lisans metni system_settings "license" anahtarında durur (gizli değildir:
 * imzalı ve herkese açık doğrulanabilir; içinde sır yoktur). Durum her istekte yeniden hesaplanmaz:
 * 60 sn süreli bellek önbelleği; kaydet/kaldır önbelleği boşaltır.
 */
const KEY = "license";
const TTL_MS = 60_000;
let cache: { at: number; status: LicenseStatus } | null = null;

export function clearLicenseCache(): void {
  cache = null;
}

export async function getStoredLicenseText(): Promise<string | null> {
  const row = await getDb().systemSetting.findUnique({ where: { key: KEY } });
  return row?.value ?? null;
}

/** Bu kurulumun kimliği: APP_URL alan adı + kurum adı ve sicil (yoksa vergi) numarası. */
export async function getLicenseInstance(): Promise<LicenseInstance> {
  let domain: string | null = null;
  try {
    const appUrl = getEnv().APP_URL;
    domain = appUrl ? new URL(appUrl).hostname : null;
  } catch {
    domain = null;
  }
  const profile = await getOrganizationProfile().catch(() => null);
  return { domain, organisation: { name: profile?.name ?? null, registryId: profile?.registerNumber ?? profile?.taxNumber ?? null } };
}

export async function getLicenseStatus(now = new Date()): Promise<LicenseStatus> {
  if (cache && now.getTime() - cache.at < TTL_MS) return cache.status;
  const [text, instance] = await Promise.all([getStoredLicenseText(), getLicenseInstance()]);
  const status = evaluateLicense(text, loadLicenseIssuers(), instance, { now });
  cache = { at: now.getTime(), status };
  return status;
}

/** Sunucu tarafı özellik kapısı; arayüze yalnız boolean iner. */
export async function hasLicensedFeature(feature: string): Promise<boolean> {
  return statusHasFeature(await getLicenseStatus(), feature);
}

/** Kaydetmeden önce değerlendirir; yalnız imzası geçerli lisans kaydedilir (eşleşmeyen de kaydedilir, ekranda nedeni görünür). */
export async function saveLicense(text: string): Promise<LicenseStatus> {
  const status = evaluateLicense(text.trim(), loadLicenseIssuers(), await getLicenseInstance());
  if (status.state === "invalid" || status.state === "none") return status;
  await getDb().systemSetting.upsert({
    where: { key: KEY },
    create: { key: KEY, value: text.trim(), description: "license" },
    update: { value: text.trim() },
  });
  clearLicenseCache();
  return status;
}

export async function removeLicense(): Promise<void> {
  await getDb().systemSetting.deleteMany({ where: { key: KEY } });
  clearLicenseCache();
}
