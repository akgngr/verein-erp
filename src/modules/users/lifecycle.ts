import "server-only";

import type { ModuleLifecycle } from "@/modules/system/server";
import { getDb } from "@/shared/db";

/** Kullanıcı silindiğinde zaman sınırlı harici erişim kayıtlarını temizler (DSGVO Art. 17). */
export const lifecycle: ModuleLifecycle = {
  onUserDeleted: async (userId) => {
    await getDb().externalAccessGrant.deleteMany({ where: { userId } });
  },
};
