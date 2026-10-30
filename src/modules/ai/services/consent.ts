import "server-only";

import { getDb } from "@/shared/db";

/** Bilgilendirme metni değişirse sürüm artırılır; eski rızalar geçersiz sayılır ve yeniden istenir. */
export const AI_CONSENT_VERSION = 1;

export async function hasAiConsent(userId: string): Promise<boolean> {
  const row = await getDb().aiUserConsent.findUnique({ where: { userId } });
  return row?.version === AI_CONSENT_VERSION;
}

export async function giveAiConsent(userId: string): Promise<void> {
  await getDb().aiUserConsent.upsert({
    where: { userId },
    create: { userId, version: AI_CONSENT_VERSION },
    update: { version: AI_CONSENT_VERSION, acceptedAt: new Date() },
  });
}

export async function revokeAiConsent(userId: string): Promise<void> {
  await getDb().aiUserConsent.deleteMany({ where: { userId } });
}

/** API anahtarı tanımlı mı (değer asla okunmaz/loglanmaz). */
export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}
