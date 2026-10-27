import "server-only";

import type { MemberDueStatus, Prisma } from "@prisma/client";

/**
 * Aidat durumu hesaplama (Faz 3 eklemeleri).
 *
 * KARAR: recalculateDueStatus TEK yazma noktasıdır — MemberPayment
 * ekleme/iptal işlemleriyle AYNI transaction içinde çağrılır. Ödenen tutar
 * denormalize EDİLMEZ; her çağrıda void edilmemiş ödemeler toplanır.
 * WAIVED özel durumudur: elle verilir, ödeme yoksa korunur; ödeme kaydedilirse
 * durum yeniden türetilir (muafiyet düşer).
 */

/** Prisma Decimal(12,2) → integer cent. */
export function decimalToCents(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value.mul(100).toFixed(0));
}

/** Durum türetme kuralı (saf fonksiyon — test edilebilirlik için ayrıldı). */
export function deriveDueStatus(
  amountDueCents: number,
  paidCents: number,
  currentStatus: MemberDueStatus,
): MemberDueStatus {
  if (currentStatus === "WAIVED" && paidCents === 0) return "WAIVED";
  if (amountDueCents > 0 && paidCents >= amountDueCents) return "PAID";
  if (paidCents > 0) return "PARTIAL";
  return "OPEN";
}

/**
 * (memberId, year) aidat satırının durumunu ödemelere göre yeniden hesaplar.
 * Satır yoksa sessizce döner (aidat satırı olmadan kaydedilen ödemeler
 * geçerlidir — bkz. şema karar notu). Mutlaka bir transaction içinde çağrılmalı.
 */
export async function recalculateDueStatus(
  tx: Prisma.TransactionClient,
  memberId: string,
  year: number,
): Promise<void> {
  const due = await tx.memberDue.findUnique({
    where: { memberId_year: { memberId, year } },
    select: { id: true, status: true, amountDue: true },
  });
  if (!due) return;

  const aggregate = await tx.memberPayment.aggregate({
    where: { memberId, dueYear: year, voidedAt: null },
    _sum: { amount: true },
  });

  const nextStatus = deriveDueStatus(
    decimalToCents(due.amountDue),
    decimalToCents(aggregate._sum.amount),
    due.status,
  );

  if (nextStatus !== due.status) {
    await tx.memberDue.update({ where: { id: due.id }, data: { status: nextStatus } });
  }
}
