import "server-only";

import { getDb } from "@/shared/db";

export type StatutoryPurgeResult = {
  deletedCount: number;
};

/**
 * § 72a Abs. 5 SGB VIII uyarınca yasal silinme (gesetzliche Löschung):
 * - Faaliyetin sona ermesinden en geç 3 ay sonra veriler silinmelidir.
 * - Faaliyet hiç başlamadıysa / üstlenilmediyse derhal silinmelidir.
 *
 * activityEndedAt referans alınarak:
 * 1. activityEndedAt <= (asOf - 3 ay) olan tüm kayıtlar,
 * 2. veya faaliyeti üstlenmeyip men edilen ve activityEndedAt <= asOf olan kayıtlar
 * kalıcı olarak (hard delete) silinir.
 */
export async function purgeStatutoryRecords(asOf: Date = new Date()): Promise<StatutoryPurgeResult> {
  const db = getDb();

  const threeMonthsAgo = new Date(asOf);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const result = await db.youthProtectionRecord.deleteMany({
    where: {
      OR: [
        {
          activityEndedAt: {
            lte: threeMonthsAgo,
          },
        },
        {
          activityEndedAt: {
            lte: asOf,
          },
          status: "EXCLUDED",
        },
      ],
    },
  });

  return {
    deletedCount: result.count,
  };
}
