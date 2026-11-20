import "server-only";

import { getDb } from "@/shared/db";
import { openSecret } from "@/shared/security/secret-box";

/**
 * N6 (#363) — sekreter kanal tercihlerinin merkezi bildirim sistemine taşınması. İdempotent (yalnız eksikleri
 * oluşturur; kullanıcının bildirim sisteminde verdiği kararı ezmez). Kaynak tablolar silinmez (geri dönüş güvenliği).
 * - Sekreter tercihinde "email" seçili → `secretary.daily-digest` için e-posta tercihi açık.
 * - Doğrulanmış ve geri alınmamış Telegram/WhatsApp/SMS rızası → bildirim kanal bağı (adres yeniden şifrelenir).
 */
const CONSENT_PURPOSE = "secretary-channel";

export type MigrationResult = { emailPreferences: number; links: number };

export async function migrateSecretaryToNotifications(): Promise<MigrationResult> {
  const { ensurePreference, importVerifiedChannelLink } = await import("@/modules/notifications/automation");
  const db = getDb();
  const result: MigrationResult = { emailPreferences: 0, links: 0 };
  const prefs = await db.secretaryPreference.findMany({ where: { channels: { has: "email" } }, select: { userId: true }, take: 5000 });
  for (const pref of prefs) if (await ensurePreference(pref.userId, "secretary.daily-digest", "email", true)) result.emailPreferences += 1;
  const consents = await db.secretaryChannelConsent.findMany({ where: { verifiedAt: { not: null }, revokedAt: null, addressEnc: { not: null } }, take: 5000 });
  for (const consent of consents) {
    if (!["telegram", "whatsapp", "sms"].includes(consent.channel)) continue;
    const address = openSecret(CONSENT_PURPOSE, consent.addressEnc!);
    if (!address) continue;
    if (await importVerifiedChannelLink(consent.userId, consent.channel as "telegram" | "whatsapp" | "sms", address, consent.verifiedAt!)) result.links += 1;
  }
  return result;
}
