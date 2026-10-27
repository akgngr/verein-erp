import "server-only";

import { getDb } from "@/shared/db";

import { berlinToday } from "../utils";
import { decimalToCents } from "../services/dues-calculation";
import type { DuesStats } from "../types";

/**
 * Aidat raporu istatistikleri (Faz 3 eklemeleri).
 *
 * KARAR: Beklenen = WAIVED olmayan satırların amountDue toplamı. Tahsilat =
 * o yılki TÜM void edilmemiş ödemeler (aidat satırı olmayan/geçmiş dönemden
 * kalma ödemeler dahil — kasaya gerçekten giren paradır). Bu yüzden kalan
 * negatif çıkabilir (muaf/aidatsız ödeme); arayüz ham gösterir, düzeltme yapılmaz.
 */
export async function getDuesStats(year: number): Promise<DuesStats> {
  const db = getDb();

  const [dues, paymentSums] = await Promise.all([
    db.memberDue.findMany({
      where: { year, member: { deletedAt: null } },
      select: { amountDue: true, status: true, dueDate: true },
    }),
    db.memberPayment.groupBy({
      by: ["memberId"],
      where: { dueYear: year, voidedAt: null, member: { deletedAt: null } },
      _sum: { amount: true },
    }),
  ]);

  const collectedCents = paymentSums.reduce(
    (sum, row) => sum + decimalToCents(row._sum.amount),
    0,
  );

  const today = berlinToday();
  let expectedCents = 0;
  let openCount = 0;
  let partialCount = 0;
  let paidCount = 0;
  let waivedCount = 0;
  let overdueCount = 0;

  for (const due of dues) {
    if (due.status === "WAIVED") {
      waivedCount += 1;
      continue;
    }
    expectedCents += decimalToCents(due.amountDue);
    if (due.status === "PAID") paidCount += 1;
    else if (due.status === "PARTIAL") partialCount += 1;
    else openCount += 1;
    if (due.status !== "PAID" && due.dueDate.getTime() < today.getTime()) {
      overdueCount += 1;
    }
  }

  return {
    year,
    expectedCents,
    collectedCents,
    remainingCents: expectedCents - collectedCents,
    collectionRate:
      expectedCents > 0 ? Math.round((collectedCents / expectedCents) * 100) : null,
    openCount,
    partialCount,
    paidCount,
    waivedCount,
    overdueCount,
  };
}
