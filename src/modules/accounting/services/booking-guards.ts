import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";

import { berlinToday } from "../utils";

/**
 * Fiş iş kuralları denetçisi (§ 8): tarih kısıtları + yıl kilidi + hesap
 * uygunluğu. Hatalar Türkçe BookingRuleError; aksiyon katmanı ActionError'a
 * çevirir (createAction bunu otomatik yapar).
 */

export class BookingRuleError extends Error {
  /** Çeviri anahtarı mesajı için yer tutucu değerleri (bkz. ActionError). */
  constructor(
    message: string,
    _fieldErrors?: undefined,
    public values?: Record<string, string | number>,
  ) {
    super(message);
  }
}

/** Yıl kilitli mi? (AccountingYear.lockedAt doluysa kilitli; § 8 md. 8.) */
export async function isYearLocked(
  year: number,
  tx?: Prisma.TransactionClient,
): Promise<boolean> {
  const db = tx ?? getDb();
  const row = await db.accountingYear.findUnique({ where: { year } });
  return row?.lockedAt != null;
}

/**
 * Fiş tarihi kuralları (§ 8 md. 3): gelecekte olamaz, hesap açılış tarihinden
 * önce olamaz (virman için her iki hesap), yılı kilitli olamaz, hesaplar aktif.
 */
export async function assertBookingDateAllowed(args: {
  bookingDate: Date;
  year: number;
  accountIds: string[];
  tx: Prisma.TransactionClient;
}): Promise<void> {
  const { bookingDate, year, accountIds, tx } = args;

  if (await isYearLocked(year, tx)) {
    throw new BookingRuleError("accounting.errors.yearLockedDate", undefined, { year });
  }

  const today = berlinToday();
  if (bookingDate.getTime() > today.getTime()) {
    throw new BookingRuleError("accounting.errors.bookingDateFuture");
  }

  const accounts = await tx.accountingAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, name: true, openingDate: true, isActive: true },
  });
  if (accounts.length !== accountIds.length) {
    throw new BookingRuleError("accounting.errors.accountNotFound");
  }
  for (const account of accounts) {
    if (!account.isActive) {
      throw new BookingRuleError("accounting.errors.accountDisabled", undefined, { name: account.name });
    }
    if (bookingDate.getTime() < account.openingDate.getTime()) {
      throw new BookingRuleError(
        "accounting.errors.beforeOpeningNamed", undefined, { name: account.name },
      );
    }
  }
}

/** Kategori uygunluğu (§ 8 md. 1): aktif + yön uyar + virmanda kategori yok. */
export async function assertCategoryMatches(
  categoryId: string,
  direction: "INCOME" | "EXPENSE",
  tx: Prisma.TransactionClient,
): Promise<void> {
  const category = await tx.accountingCategory.findUnique({
    where: { id: categoryId },
    select: { name: true, direction: true, isActive: true },
  });
  if (!category) throw new BookingRuleError("accounting.errors.categoryNotFound");
  if (!category.isActive) {
    throw new BookingRuleError("accounting.errors.categoryDisabled", undefined, { name: category.name });
  }
  if (category.direction !== direction) {
    throw new BookingRuleError("accounting.errors.categoryDirection");
  }
}
