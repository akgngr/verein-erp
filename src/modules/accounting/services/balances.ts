import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import { centsToDecimalString } from "@/shared/money";
import { ActionError } from "@/modules/auth/server";

/**
 * Bakiye hesapları + Kassenminus kuralı (§ 8 md. 9-10).
 *
 * Hesap bakiyesi D tarihinde = açılış bakiyesi (openingDate ≤ D) + gelirler
 * − giderler − virman çıkışı + virman girişi (yalnızca ters kayıt edilmemiş fişler,
 * openingDate ≤ bookingDate ≤ D). Tüm aritmetik integer cent.
 */

/** Bir fişin bakiyeye etkisi (cent): gelir +, gider −, virman hedef hesaba +. */
type Movement = { accountId: string; counterAccountId: string | null; type: string; amountCents: number };

export function movementEffectOn(
  movement: Movement,
  accountId: string,
): number {
  const amount = movement.amountCents;
  if (movement.type === "INCOME") {
    return movement.accountId === accountId ? amount : 0;
  }
  if (movement.type === "EXPENSE") {
    return movement.accountId === accountId ? -amount : 0;
  }
  if (movement.type === "TRANSFER") {
    if (movement.accountId === accountId) return -amount;
    if (movement.counterAccountId === accountId) return amount;
    return 0;
  }
  return 0;
}

/** Tüm aktif hareketler: ters kayıt edilmemiş, açılış tarihi sonrası, kronolojik. */
async function loadMovements(
  accountId: string,
  untilDate?: Date,
  tx?: Prisma.TransactionClient,
) {
  const db = tx ?? getDb();
  const account = await db.accountingAccount.findUniqueOrThrow({
    where: { id: accountId },
    select: { openingBalance: true, openingDate: true },
  });

  const rows = await db.accountingBooking.findMany({
    where: {
      reversedAt: null,
      OR: [{ accountId }, { counterAccountId: accountId }],
      bookingDate: { gte: account.openingDate, ...(untilDate ? { lte: untilDate } : {}) },
    },
    select: {
      bookingDate: true,
      sequence: true,
      type: true,
      amount: true,
      accountId: true,
      counterAccountId: true,
    },
    orderBy: [{ bookingDate: "asc" }, { sequence: "asc" }],
  });

  const openingBalanceCents = Number(account.openingBalance.mul(100).toFixed(0));
  const movements = rows.map((row) => ({
    bookingDate: row.bookingDate,
    sequence: row.sequence,
    type: row.type as string,
    accountId: row.accountId,
    counterAccountId: row.counterAccountId,
    amountCents: Number(row.amount.mul(100).toFixed(0)),
  }));

  return { openingBalanceCents, movements };
}

/** Hesabın D tarihine kadar (D dahil) bakiyesi (cent) — § 8 md. 10. */
export async function accountBalanceAt(
  accountId: string,
  untilDate?: Date,
  tx?: Prisma.TransactionClient,
): Promise<number> {
  const { openingBalanceCents, movements } = await loadMovements(accountId, untilDate, tx);
  return movements.reduce(
    (sum, movement) => sum + movementEffectOn(movement, accountId),
    openingBalanceCents,
  );
}

/**
 * Kassenminus (§ 8 md. 9): CASH hesabın kronolojik yürüyen bakiyesi HİÇBİR
 * noktada negatif olamaz. Create/reverse akışlarında transaction içinde çağrılır —
 * tx zaten yeni fişi (veya reverse edilmiş fişi) görür. BANK/OTHER eksiye düşebilir.
 */
export async function assertNoNegativeCash(
  accountId: string,
  tx: Prisma.TransactionClient,
): Promise<void> {
  const db = tx;
  const account = await db.accountingAccount.findUniqueOrThrow({
    where: { id: accountId },
    select: { type: true },
  });
  if (account.type !== "CASH") return;

  const { openingBalanceCents, movements } = await loadMovements(accountId, undefined, tx);

  let running = openingBalanceCents;
  for (const movement of movements) {
    running += movementEffectOn(movement, accountId);
    if (running < 0) {
      throw new ActionError("accounting.errors.cashNegative");
    }
  }
}

/**
 * CASH hesap için güncelleme güvenli sürümü: mevcut fişleri VE aday hareketi
 * birlikte değerlendirir (exclude + replace tek listede).
 * KARAR: yukarıdaki assertNoNegativeCash create/reverse akışlarında yeterli;
 * güncellemede eski fiş hariç tutulup yeni hareket eklenerek bu fonksiyon kullanılır.
 */
export async function assertNoNegativeCashWithReplacement(
  accountId: string,
  tx: Prisma.TransactionClient,
  excludeBookingId: string,
  replacement: {
    bookingDate: Date;
    type: string;
    accountId: string;
    counterAccountId: string | null;
    amountCents: number;
  } | null,
): Promise<void> {
  const db = tx;
  const account = await db.accountingAccount.findUniqueOrThrow({
    where: { id: accountId },
    select: { type: true },
  });
  if (account.type !== "CASH") return;

  const { openingBalanceCents, movements } = await loadMovements(accountId, undefined, tx);

  const deltas: Array<{ key: string; delta: number }> = movements.map((movement, index) => ({
    key: `${movement.bookingDate.toISOString().slice(0, 10)}#${String(movement.sequence).padStart(6, "0")}#${index}`,
    delta: movementEffectOn(movement, accountId),
  }));

  // Eski fişin etkisini listeden düş (tüm satırları — fiş accountId veya counterAccountId olabilir).
  const oldRows = await db.accountingBooking.findMany({
    where: { id: excludeBookingId },
    select: { bookingDate: true, sequence: true, type: true, accountId: true, counterAccountId: true, amount: true },
  });
  for (const row of oldRows) {
    const delta = movementEffectOn(
      {
        accountId: row.accountId,
        counterAccountId: row.counterAccountId,
        type: row.type as string,
        amountCents: Number(row.amount.mul(100).toFixed(0)),
      },
      accountId,
    );
    const key = `${row.bookingDate.toISOString().slice(0, 10)}#${String(row.sequence).padStart(6, "0")}#old`;
    deltas.push({ key, delta: -delta });
  }

  if (replacement) {
    deltas.push({
      key: `${replacement.bookingDate.toISOString().slice(0, 10)}#new`,
      delta: movementEffectOn(replacement, accountId),
    });
  }

  deltas.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  let running = openingBalanceCents;
  for (const delta of deltas) {
    running += delta.delta;
    if (running < 0) {
      throw new ActionError("accounting.errors.cashNegative");
    }
  }
}

/** Decimal(12,2) kolonuna yazılacak string (cent'ten). */
export function toDecimal(cents: number): string {
  return centsToDecimalString(cents);
}
