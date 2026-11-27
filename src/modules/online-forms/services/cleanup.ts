import "server-only";

import type { Prisma } from "@prisma/client";

/** Silinen üyeye ait bekleyen çevrimiçi form davetlerini aynı transaction içinde iptal eder (#578). */
export async function cancelPendingMemberForms(
  tx: Prisma.TransactionClient,
  memberId: string,
): Promise<void> {
  await tx.onlineFormRequest.updateMany({
    where: { kind: "MEMBER", subjectId: memberId, status: "PENDING" },
    data: { status: "CANCELLED" },
  });
}
