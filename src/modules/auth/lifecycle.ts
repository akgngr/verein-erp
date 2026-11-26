import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/** Kullanıcı silinince profil (banka, adres, iletişim, vergi numarası) ve 2FA (#603: sır, kurtarma kodları) silinir. */
export const lifecycle = defineLifecycle({
  moduleKey: "auth",
  onUserDeleted: async (userId) => {
    const db = getDb();
    await db.userProfile.deleteMany({ where: { userId } });
    await db.userTotp.deleteMany({ where: { userId } });
    await db.userTotpRecoveryCode.deleteMany({ where: { userId } });
  },
});
