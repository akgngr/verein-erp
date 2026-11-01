import "server-only";

import { getDb } from "@/shared/db";
import { openSecret, sealSecret } from "@/shared/security/secret-box";

import { GoCardlessProvider } from "./providers/gocardless";
import { MockBankProvider } from "./providers/mock";
import { BankProviderError, type BankProvider } from "./providers/types";

const PURPOSE = "banking.provider";
export const BANK_PROVIDERS = ["GOCARDLESS", "MOCK"] as const;
export type BankProviderKey = (typeof BANK_PROVIDERS)[number];

/**
 * Test sağlayıcısı üretimde kapalıdır. Üretim derlemesiyle çalışan test sunucuları için
 * BANKING_ALLOW_MOCK=true ile açıkça izin verilebilir (gerçek kurulumda tanımlamayın).
 */
export function isMockAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.BANKING_ALLOW_MOCK === "true";
}

/** Ekrana dönen durum: anahtarların kendisi ASLA dönmez, yalnızca kayıtlı olup olmadığı. */
export async function getBankingSettings(): Promise<{ provider: BankProviderKey; hasCredentials: boolean; mockAllowed: boolean }> {
  const row = await getDb().bankingSettings.findUnique({ where: { id: "singleton" } });
  const provider = (row?.provider === "MOCK" && isMockAllowed() ? "MOCK" : "GOCARDLESS") as BankProviderKey;
  return { provider, hasCredentials: Boolean(row?.secretIdSealed && row?.secretKeySealed), mockAllowed: isMockAllowed() };
}

export async function saveBankingSettings(input: { provider: BankProviderKey; secretId?: string; secretKey?: string }): Promise<void> {
  const data: { provider: string; secretIdSealed?: string; secretKeySealed?: string } = { provider: input.provider };
  if (input.secretId) data.secretIdSealed = sealSecret(PURPOSE, input.secretId);
  if (input.secretKey) data.secretKeySealed = sealSecret(PURPOSE, input.secretKey);
  await getDb().bankingSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", ...data }, update: data });
}

/** Etkin sağlayıcı (bağlantı kaydındaki sağlayıcı anahtarına göre de seçilebilir). */
export async function getProvider(key?: string): Promise<BankProvider> {
  const row = await getDb().bankingSettings.findUnique({ where: { id: "singleton" } });
  const wanted = key ?? row?.provider ?? "GOCARDLESS";
  if (wanted === "MOCK") {
    if (!isMockAllowed()) throw new BankProviderError("mock disabled", "notConfigured"); // i18n-ignore (iç hata)
    return new MockBankProvider();
  }
  const secretId = row?.secretIdSealed ? openSecret(PURPOSE, row.secretIdSealed) : null;
  const secretKey = row?.secretKeySealed ? openSecret(PURPOSE, row.secretKeySealed) : null;
  if (!secretId || !secretKey) throw new BankProviderError("missing credentials", "notConfigured"); // i18n-ignore (iç hata)
  return new GoCardlessProvider(secretId, secretKey);
}
