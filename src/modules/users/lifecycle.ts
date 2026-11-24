import "server-only";

import type { ModuleLifecycle } from "@/shared/modules/lifecycle";
import { getDb } from "@/shared/db";

/** Kullanıcı silindiğinde zaman sınırlı harici erişim kayıtlarını temizler (DSGVO Art. 17). */
export const lifecycle: ModuleLifecycle = {
  moduleKey: "users",
  onUserDeleted: async (userId) => {
    const db = getDb();
    await db.externalAccessGrant.deleteMany({ where: { userId } });
    await db.userNavPreference.deleteMany({ where: { userId } });
    await db.userInvitation.deleteMany({ where: { userId } });
  },
};
