import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/** Kullanıcı silinince bildirimleri, tercihleri ve teslim kayıtları silinir (DSGVO Art. 17). */
export const lifecycle = defineLifecycle({
  moduleKey: "notifications",
  onUserDeleted: async (userId) => {
    const db = getDb();
    await db.$transaction([
      db.notification.deleteMany({ where: { userId } }),
      db.notificationPreference.deleteMany({ where: { userId } }),
      db.notificationSettings.deleteMany({ where: { userId } }),
      db.notificationDelivery.deleteMany({ where: { userId } }),
      db.notificationChannelLink.deleteMany({ where: { userId } }),
      db.notificationPushSubscription.deleteMany({ where: { userId } }),
    ]);
  },
});
