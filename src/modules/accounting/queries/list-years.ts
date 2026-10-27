import "server-only";

import { getDb } from "@/shared/db";

import type { YearClosingRow } from "../types";

/** Yıl kapanış tablosu (§ 11.6): fişi olan yıllar + geçerli yıl. */
export async function listYearsWithBookings(): Promise<YearClosingRow[]> {
  const db = getDb();

  const grouped = await db.accountingBooking.groupBy({
    by: ["year", "type"],
    where: { reversedAt: null },
    _count: { _all: true },
    _sum: { amount: true },
  });

  const years = new Map<number, { bookingCount: number; incomeCents: number; expenseCents: number }>();
  for (const row of grouped) {
    const entry = years.get(row.year) ?? { bookingCount: 0, incomeCents: 0, expenseCents: 0 };
    entry.bookingCount += row._count._all;
    const cents = Number(row._sum.amount ? row._sum.amount.mul(100).toFixed(0) : 0);
    if (row.type === "INCOME") entry.incomeCents += cents;
    else if (row.type === "EXPENSE") entry.expenseCents += cents;
    years.set(row.year, entry);
  }

  const currentYear = new Date().getUTCFullYear();
  if (!years.has(currentYear)) {
    years.set(currentYear, { bookingCount: 0, incomeCents: 0, expenseCents: 0 });
  }

  const locks = await db.accountingYear.findMany();
  const lockByYear = new Map(locks.map((lock) => [lock.year, lock]));

  const rows: YearClosingRow[] = [];
  for (const [year, totals] of [...years.entries()].sort((a, b) => b[0] - a[0])) {
    const missingReceiptCount = await db.accountingBooking.count({
      where: {
        year,
        reversedAt: null,
        type: { not: "TRANSFER" },
        sourceType: null,
        files: { none: { deletedAt: null } },
      },
    });
    const lock = lockByYear.get(year);
    rows.push({
      year,
      bookingCount: totals.bookingCount,
      incomeCents: totals.incomeCents,
      expenseCents: totals.expenseCents,
      missingReceiptCount,
      lockedAt: lock?.lockedAt ? lock.lockedAt.toISOString() : null,
      lockedByLabel: lock?.lockedByLabel ?? null,
    });
  }
  return rows;
}
