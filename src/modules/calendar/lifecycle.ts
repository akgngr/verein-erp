import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/**
 * Kullanıcı silinince kişisel takvim (kayıtlar cascade), ICS aboneliği ve dış takvim bağlantıları
 * (şifreli erişim bilgileri ve alınan kayıtlar cascade) silinir. Ortak takvimlere eklediği kayıtlar kalır.
 */
export const lifecycle = defineLifecycle({
  moduleKey: "calendar",
  onUserDeleted: async (userId) => {
    const db = getDb();
    await db.$transaction([
      db.calendar.deleteMany({ where: { kind: "PERSONAL", ownerId: userId } }),
      db.calendarFeedToken.deleteMany({ where: { userId } }),
      db.calendarSyncAccount.deleteMany({ where: { userId } }),
    ]);
  },
});
