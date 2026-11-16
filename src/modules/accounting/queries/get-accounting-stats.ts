import "server-only";

import { getDb } from "@/shared/db";

import type { AccountingStats } from "../types";
import { accountBalanceAt } from "../services/balances";
import { countMissingReceipts } from "../services/report-builders";
import { getBookingTotals } from "./get-booking-totals";

/** Panel + liste istatistikleri (§ 14): gelir/gider/fark + eksik belge + bakiyeler. */
export async function getAccountingStats(year: number): Promise<AccountingStats> {
  const db = getDb();

  const { incomeCents, expenseCents, netCents } = await getBookingTotals(year);

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
    netCents,
    missingReceiptCount,
    accountBalances,
  };
}
