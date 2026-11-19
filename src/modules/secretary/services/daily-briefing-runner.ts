import "server-only";

// Worker-safe giriş: users/server next-auth zincirini yükler ve worker'da çalışmaz.
import { getUserById } from "@/modules/users/automation";
import { getDb } from "@/shared/db";

import { getBriefing } from "./briefing";
import { type DailyBriefingResult, runDailyBriefings } from "./daily-briefing";

/** Veritabanına bağlı varsayılanlarla günlük özet çalıştırması (worker). */
export async function runScheduledBriefings(now: Date): Promise<DailyBriefingResult> {
  const db = getDb();
  return runDailyBriefings(now, {
    listPreferences: () =>
      db.secretaryPreference.findMany({
        where: { briefingEnabled: true },
        select: { userId: true, briefingEnabled: true, briefingTime: true, quietFrom: true, quietTo: true, lastBriefingOn: true, channels: true },
        take: 5000,
      }),
    claim: async (userId, date) =>
      (await db.secretaryPreference.updateMany({
        where: { userId, OR: [{ lastBriefingOn: null }, { lastBriefingOn: { not: date } }] },
        data: { lastBriefingOn: date },
      })).count === 1,
    loadUser: async (userId) => {
      const user = await getUserById(userId);
      return user ? { id: user.id, role: user.role, isActive: user.isActive } : null;
    },
    // Özet sayıları için başlık gerekmez; worker'da istek bağlamı olmadığından çeviri anahtarı yeterli.
    buildBriefing: (user, at) => getBriefing(user, at, { translator: async () => (key) => key, proposals: false }),
    // Dış kanal teslimi (özet e-postası) T3.2 şablonuyla eklenir; o zamana kadar yalnız uygulama içi.
  });
}
