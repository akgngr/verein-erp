import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/** S4.1 (#313): kullanıcı silinince sınıflama rızası, yanıt taslakları ve görev bağlantıları silinir (DSGVO Art. 17). */
export const lifecycle = defineLifecycle({
  moduleKey: "mail",
  onUserDeleted: async (userId) => {
    const db = getDb();
    await db.$transaction([
      db.mailTriageOptIn.deleteMany({ where: { userId } }),
      db.mailReplyDraft.deleteMany({ where: { userId } }),
      db.mailTriageTask.deleteMany({ where: { userId } }),
    ]);
  },
});
