import "server-only";

import { getDb } from "@/shared/db";

import type { AccountBalance, AccountOption } from "../types";
import { accountBalanceAt } from "../services/balances";

/** Hesap + güncel bakiye çipleri (§ 11.1): aktif hesaplar; bakiye bugüne kadar. */
export async function listAccountBalances(): Promise<AccountBalance[]> {
  const db = getDb();
  const accounts = await db.accountingAccount.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true, isActive: true },
  });

  const balances: AccountBalance[] = [];
  for (const account of accounts) {
    const balanceCents = await accountBalanceAt(account.id);
    balances.push({ ...account, balanceCents });
  }
  return balances;
}

/** Form seçenekleri: aktif hesaplar (yeni fişte kullanılabilir). */
export async function listAccountOptions(): Promise<AccountOption[]> {
  const rows = await getDb().accountingAccount.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true, isActive: true },
  });
  return rows;
}

/** Ayarlar sekmesi: TÜM hesaplar (aktif + pasif). */
export async function listAllAccounts(): Promise<Array<{
  id: string;
  name: string;
  type: string;
  openingBalanceCents: number;
  openingDate: Date;
  isActive: boolean;
  bookingCount: number;
  accountNumber: string | null;
}>> {
  const db = getDb();
  const accounts = await db.accountingAccount.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      openingBalance: true,
      openingDate: true,
      isActive: true,
      accountNumber: true,
      _count: { select: { bookings: true } },
    },
  });
  const result = [];
  for (const account of accounts) {
    result.push({
      id: account.id,
      name: account.name,
      type: account.type,
      openingBalanceCents: Number(account.openingBalance.mul(100).toFixed(0)),
      openingDate: account.openingDate,
      isActive: account.isActive,
      bookingCount: account._count.bookings,
      accountNumber: account.accountNumber,
    });
  }
  return result;
}
