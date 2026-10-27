import "server-only";

import { getDb } from "@/shared/db";

import { berlinToday } from "../utils";
import { decimalToCents } from "../services/dues-calculation";
import type { DueRow } from "../types";

/**
 * Bir üyenin yıllık aidat satırları (üye detay paneli, Faz 3 eklemeleri).
 * Ödenen tutar void edilmemiş ödemelerin (memberId, dueYear) toplamıdır —
 * denormalize edilmez (bkz. şema karar notu).
 */
export async function listMemberDues(memberId: string): Promise<DueRow[]> {
  const db = getDb();

  const [dues, payments] = await Promise.all([
    db.memberDue.findMany({
      where: { memberId },
      orderBy: { year: "desc" },
    }),
    db.memberPayment.findMany({
      where: { memberId, voidedAt: null },
      select: { dueYear: true, amount: true },
    }),
  ]);

  const paidByYear = new Map<number, number>();
  for (const payment of payments) {
    const cents = decimalToCents(payment.amount);
    paidByYear.set(payment.dueYear, (paidByYear.get(payment.dueYear) ?? 0) + cents);
  }

  const today = berlinToday();

  return dues.map((due) => {
    const amountDueCents = decimalToCents(due.amountDue);
    const paidCents = paidByYear.get(due.year) ?? 0;
    return {
      id: due.id,
      year: due.year,
      amountDueCents,
      paidCents,
      remainingCents: Math.max(0, amountDueCents - paidCents),
      status: due.status,
      dueDate: due.dueDate.toISOString().slice(0, 10),
      note: due.note,
      overdue:
        due.status !== "PAID" &&
        due.status !== "WAIVED" &&
        due.dueDate.getTime() < today.getTime(),
    };
  });
}
