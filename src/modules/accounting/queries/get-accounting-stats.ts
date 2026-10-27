import "server-only";

import { getDb } from "@/shared/db";

import type { AccountingStats } from "../types";
import { accountBalanceAt } from "../services/balances";
import { countMissingReceipts } from "../services/report-builders";

/** Panel + liste istatistikleri (§ 14): gelir/gider/fark + eksik belge + bakiyeler. */
export async function getAccountingStats(year: number): Promise<AccountingStats> {
  const db = getDb();

  const totals = await db.accountingBooking.groupBy({
    by: ["type"],
    where: { year, reversedAt: null, type: { not: "TRANSFER" } },
    _sum: { amount: true },
  });

  let incomeCents = 0;
  let expenseCents = 0;
  for (const total of totals) {
    const cents = Number(total._sum.amount ? total._sum.amount.mul(100).toFixed(0) : 0);
    if (total.type === "INCOME") incomeCents += cents;
    else if (total.type === "EXPENSE") expenseCents += cents;
  }

  const [missingReceiptCount, accounts] = await Promise.all([
    countMissingReceipts(year),
    db.accountingAccount.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const accountBalances: Array<{ accountId: string; name: string; balanceCents: number }> = [];
  for (const account of accounts) {
    accountBalances.push({
      accountId: account.id,
      name: account.name,
      balanceCents: await accountBalanceAt(account.id),
    });
  }

  return {
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    missingReceiptCount,
    accountBalances,
  };
}
