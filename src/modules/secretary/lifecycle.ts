import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/**
 * Kullanıcı silinince sekreter tercihleri, öğe görünürlüğü, önerileri ve takip kayıtları silinir (DSGVO Art. 17).
 * Modül kapatılınca veri korunur (yeniden açıldığında tercihler geri gelir); öneriler süresi dolunca temizlenir.
 */
export const lifecycle = defineLifecycle({
  moduleKey: "secretary",
  onUserDeleted: async (userId) => {
    const db = getDb();
    await db.$transaction([
      db.secretaryPreference.deleteMany({ where: { userId } }),
      db.secretaryItemState.deleteMany({ where: { userId } }),
      db.secretaryProposal.deleteMany({ where: { userId } }),
      db.secretaryFollowUp.deleteMany({ where: { userId } }),
      db.secretaryChannelConsent.deleteMany({ where: { userId } }),
      db.secretaryChannelDelivery.deleteMany({ where: { userId } }),
    ]);
  },
});
