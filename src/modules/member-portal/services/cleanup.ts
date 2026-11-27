import "server-only";

import type { Prisma } from "@prisma/client";

/** Silinen üyenin aktif portal oturumlarını aynı transaction içinde iptal eder (#578). */
export async function revokePortalSessionsForMember(
  tx: Prisma.TransactionClient,
  memberId: string,
  revokedAt: Date = new Date(),
): Promise<void> {
  await tx.portalSession.updateMany({
    where: { subjectRef: `member:${memberId}`, revokedAt: null },
    data: { revokedAt },
  });
}
