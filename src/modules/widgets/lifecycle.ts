import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/** Kullanıcı silinince widget tercihleri silinir (DSGVO Art. 17). Politika kurum düzeyidir, kişisel değildir. */
export const lifecycle = defineLifecycle({
  moduleKey: "widgets",
  onUserDeleted: async (userId) => {
    await getDb().widgetUserPreference.deleteMany({ where: { userId } });
  },
});
