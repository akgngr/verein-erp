import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/** Kullanıcı silinince CRM'deki sorumlu/atanan bağlantıları boşaltılır; kayıtlar derneğe aittir, kalır. */
export const lifecycle = defineLifecycle({
  moduleKey: "crm",
  onUserDeleted: async (userId) => {
    const db = getDb();
    await db.$transaction([
      db.crmParty.updateMany({ where: { ownerId: userId }, data: { ownerId: null } }),
      db.crmDeal.updateMany({ where: { ownerId: userId }, data: { ownerId: null } }),
      db.crmFollowUp.updateMany({ where: { assigneeId: userId }, data: { assigneeId: null } }),
    ]);
  },
});
