import "server-only";

import { getDb } from "@/shared/db";
import { defineLifecycle } from "@/shared/modules/lifecycle";

/**
 * § 72a SGB VIII / DSGVO Art. 17:
 * Kullanıcı silindiğinde adli sicil inceleme kayıtları da silinir.
 */
export const lifecycle = defineLifecycle({
  moduleKey: "youth-protection",
  onUserDeleted: async (userId: string) => {
    const db = getDb();
    await db.youthProtectionRecord.deleteMany({ where: { userId } });
  },
});

/**
 * Üye silindiğinde (DSGVO Art. 17 / § 72a SGB VIII), ilgili adli sicil
 * inceleme kayıtları da temizlenir.
 */
export async function onMemberDeleted(memberId: string): Promise<void> {
  const db = getDb();
  await db.youthProtectionRecord.deleteMany({ where: { memberId } });
}
