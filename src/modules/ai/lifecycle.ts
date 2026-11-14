import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/** Kullanıcı silinince sohbetleri (mesajlar cascade), raporları ve AI rızası silinir. */
export const lifecycle = defineLifecycle({
  moduleKey: "ai",
  onUserDeleted: async (userId) => {
    const db = getDb();
    await db.$transaction([
      db.aiExportRequest.deleteMany({where:{userId}}),
      db.aiReferenceScope.deleteMany({where:{userId}}),
      db.aiProposal.deleteMany({where:{userId}}),
      db.aiTurnClaim.deleteMany({where:{userId}}),
      db.aiUsageBucket.deleteMany({where:{scopeKey:{endsWith:`:${userId}`}}}),
      db.aiConversation.deleteMany({ where: { userId } }),
      db.aiReport.deleteMany({ where: { userId } }),
      db.aiUserConsent.deleteMany({ where: { userId } }),
    ]);
  },
});
