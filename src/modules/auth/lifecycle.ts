import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/** Kullanıcı silinince profil (banka, adres, iletişim, vergi numarası) silinir. */
export const lifecycle = defineLifecycle({
  moduleKey: "auth",
  onUserDeleted: async (userId) => {
    await getDb().userProfile.deleteMany({ where: { userId } });
  },
});
