import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/** Kullanıcı silinince kişisel panel düzeni silinir. */
export const lifecycle = defineLifecycle({
  moduleKey: "system",
  onUserDeleted: async (userId) => {
    await getDb().systemDashboardLayout.deleteMany({ where: { userId } });
  },
});
