import "server-only";

import { getDb } from "@/shared/db";

import { accountBalanceAt } from "../services/balances";
import { BOOKING_SNAPSHOT_SELECT, bookingSnapshot, verifyJournal, type JournalProblem } from "../services/journal";

export type GobdStatus = {
  journal: { entries: number; bookings: number; problems: JournalProblem[]; unjournaledOnly: boolean };
  checks: {
    missingReceipts: Array<{ id: string; bookingNumber: string; bookingDate: Date; description: string }>;
    sequenceGaps: Array<{ year: number; missing: number[] }>;
    staleBankLines: number;
    draftPayables: number;
  };
  cash: Array<{ accountId: string; name: string; lastClosing: Date | null; lastClosingDifferenceCents: number | null; balanceCents: number; unclosedDays: number }>;
};

/** ACC-7 GoBD durum özeti: günlük doğrulama, tamlık kontrolleri, kasa kapanışları. */
export async function getGobdStatus(today: Date): Promise<GobdStatus> {
  const db = getDb();
  const [entries, bookings, cashAccounts, staleBankLines, draftPayables] = await Promise.all([
    db.accountingJournal.findMany({ orderBy: { seq: "asc" } }),
    db.accountingBooking.findMany({ select: { ...BOOKING_SNAPSHOT_SELECT, _count: { select: { files: { where: { deletedAt: null } } } } } }),
    db.accountingAccount.findMany({ where: { type: "CASH", isActive: true }, select: { id: true, name: true } }),
    db.accountingBankTransaction.count({ where: { status: "OPEN", bookingDate: { lt: new Date(today.getTime() - 30 * 86_400_000) } } }),
    db.accountingPayable.count({ where: { status: "DRAFT", createdAt: { lt: new Date(today.getTime() - 14 * 86_400_000) } } }),
  ]);
  const current = new Map(bookings.map((row) => [row.id, { bookingNumber: row.bookingNumber, snapshot: bookingSnapshot(row) }]));
  const problems = verifyJournal(
    entries.map((entry) => ({ ...entry, snapshot: entry.snapshot as Record<string, unknown> })),
    current,
  );

  // Belge (Beleg) eksik: elle girilmiş, iptal edilmemiş, virman olmayan ve dosyası olmayan fişler.
  const missingReceipts = bookings
    .filter((row) => !row.sourceType && !row.reversedAt && row.type !== "TRANSFER" && row._count.files === 0)
    .sort((a, b) => a.bookingDate.getTime() - b.bookingDate.getTime())
    .map((row) => ({ id: row.id, bookingNumber: row.bookingNumber, bookingDate: row.bookingDate, description: row.description }));

  // Numara boşlukları (yıl başına 1..max).
  const byYear = new Map<number, Set<number>>();
  for (const row of bookings) byYear.set(row.year, (byYear.get(row.year) ?? new Set()).add(row.sequence));
  const sequenceGaps = [...byYear]
    .map(([year, set]) => {
      const max = Math.max(...set);
      const missing: number[] = [];
      for (let n = 1; n <= max && missing.length < 50; n++) if (!set.has(n)) missing.push(n);
      return { year, missing };
    })
    .filter((item) => item.missing.length);

  const cash = await Promise.all(
    cashAccounts.map(async (account) => {
      const last = await db.accountingCashClosing.findFirst({ where: { accountId: account.id }, orderBy: { closingDate: "desc" } });
      const since = last ? last.closingDate : null;
      const days = await db.accountingBooking.findMany({
        where: { reversedAt: null, OR: [{ accountId: account.id }, { counterAccountId: account.id }], ...(since ? { bookingDate: { gt: since } } : {}) },
        distinct: ["bookingDate"],
        select: { bookingDate: true },
      });
      return {
        accountId: account.id,
        name: account.name,
        lastClosing: last?.closingDate ?? null,
        lastClosingDifferenceCents: last?.differenceCents ?? null,
        balanceCents: await accountBalanceAt(account.id, today),
        unclosedDays: days.length,
      };
    }),
  );

  return {
    journal: { entries: entries.length, bookings: bookings.length, problems, unjournaledOnly: problems.length > 0 && problems.every((problem) => problem.kind === "unjournaled") },
    checks: { missingReceipts, sequenceGaps, staleBankLines, draftPayables },
    cash,
  };
}
