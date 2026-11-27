import "server-only";

import type { Prisma } from "@prisma/client";

/** Silinen kurs dersine ait yetim yoklama kayıtlarını aynı transaction içinde temizler (#579). */
export async function deleteSessionAttendance(
  tx: Prisma.TransactionClient,
  sessionId: string,
): Promise<void> {
  await tx.progressAttendance.deleteMany({ where: { sessionId } });
}
