import "server-only";

import type { CategoryDirection } from "@prisma/client";

import { getDb } from "@/shared/db";

import {
  ECONOMIC_OPERATION_LIMIT_CENTS,
  SPHERE_ORDER,
} from "../constants";
import type {
  IncomeExpenseReport,
  IncomeExpenseRow,
  LedgerReport,
  LedgerRow,
  ProjectReportRow,
} from "../types";
import { accountBalanceAt } from "./balances";

/**
 * Rapor hesaplayıcıları (§ 11.8): ekran, Excel ve PDF TEK bu servisten beslenir
 * (no duplicated logic). Tüm aritmetik integer cent; ters kayıt edilmemiş fişler
 * ve virmanlar EÜR'den hariçtir (§ 8 md. 17 + § 11.8 md. 1).
 */

/** Ekonomik işletme uyarısı eşiği (§ 8 md. 17): %80 uyarı, üstü aşım. */
function economicNotice(incomeCents: number): "none" | "warning" | "exceeded" {
  if (incomeCents > ECONOMIC_OPERATION_LIMIT_CENTS) return "exceeded";
  if (incomeCents >= Math.round(ECONOMIC_OPERATION_LIMIT_CENTS * 0.8)) return "warning";
  return "none";
}

/** Gelir-Gider Tablosu (Einnahmen-Ausgaben-Rechnung) — § 11.8 md. 1. */
export async function buildIncomeExpenseReport(year: number): Promise<IncomeExpenseReport> {
  const db = getDb();

  const [bookings, budgetLines, categories] = await Promise.all([
    db.accountingBooking.findMany({
      where: { year, reversedAt: null, type: { not: "TRANSFER" } },
      select: {
        categoryId: true,
        type: true,
        amount: true,
        category: { select: { sphere: true, direction: true, name: true } },
      },
    }),
    db.accountingBudgetLine.findMany({ where: { year } }),
    db.accountingCategory.findMany({ where: { isActive: true } }),
  ]);

  // Gerçekleşen: kategori + yön bazında toplam.
  const actual = new Map<string, number>();
  for (const booking of bookings) {
    if (!booking.categoryId) continue;
    const cents = Number(booking.amount.mul(100).toFixed(0));
    const key = `${booking.categoryId}:${booking.type}`;
    actual.set(key, (actual.get(key) ?? 0) + cents);
  }
  const plan = new Map<string, number>();
  for (const line of budgetLines) {
    plan.set(line.categoryId, Number(line.amount.mul(100).toFixed(0)));
  }

  // Önceki yıl gerçekleşeni (Plan/Oncesi kolonu).
  const prevBookings = await db.accountingBooking.findMany({
    where: { year: year - 1, reversedAt: null, type: { not: "TRANSFER" } },
    select: { categoryId: true, type: true, amount: true },
  });
  const previous = new Map<string, number>();
  for (const booking of prevBookings) {
    if (!booking.categoryId) continue;
    const cents = Number(booking.amount.mul(100).toFixed(0));
    const key = `${booking.categoryId}:${booking.type}`;
    previous.set(key, (previous.get(key) ?? 0) + cents);
  }

  const rows: IncomeExpenseRow[] = [];
  let economicIncome = 0;

  for (const sphere of SPHERE_ORDER) {
    for (const direction of ["INCOME", "EXPENSE"] as CategoryDirection[]) {
      // Alanın o yöndeki kategorileri (aktif + fişi olanlar; KARAR: fişsiz kategori
      // raporda boş satır üretmesin — temiz rapor).
      const usedCategoryIds = new Set(
        categories
          .filter((category) => category.sphere === sphere && category.direction === direction)
          .map((category) => category.id),
      );
      const presentCategoryIds = new Set<string>();
      for (const booking of bookings) {
        if (!booking.categoryId || !booking.category) continue;
        if (booking.type !== direction) continue;
        if (booking.category.sphere === sphere) {
          presentCategoryIds.add(booking.categoryId);
        }
      }
      const categoryIds = [...new Set([...usedCategoryIds].filter((id) => presentCategoryIds.has(id)))]
        .sort((a, b) => {
          const nameA = categories.find((category) => category.id === a)?.name ?? "";
          const nameB = categories.find((category) => category.id === b)?.name ?? "";
          return nameA.localeCompare(nameB, "tr");
        });

      for (const categoryId of categoryIds) {
        const category = categories.find((item) => item.id === categoryId);
        if (!category) continue;
        const actualCents = actual.get(`${categoryId}:${direction}`) ?? 0;
        if (sphere === "ECONOMIC_OPERATION" && direction === "INCOME") {
          economicIncome += actualCents;
        }
        rows.push({
          sphere,
          categoryId,
          categoryName: category.name,
          direction,
          planCents: plan.get(categoryId) ?? 0,
          actualCents,
          previousYearCents: previous.get(`${categoryId}:${direction}`) ?? 0,
        });
      }
    }
  }

  return {
    year,
    rows,
    economicOperationIncomeCents: economicIncome,
    economicOperationNotice: economicNotice(economicIncome),
  };
}

/** Kasa/Hesap Defteri (Kassenbuch) — § 11.8 md. 2. */
export async function buildLedgerReport(
  accountId: string,
  from: string,
  to: string,
): Promise<LedgerReport> {
  const db = getDb();
  const account = await db.accountingAccount.findUniqueOrThrow({
    where: { id: accountId },
    select: { id: true, name: true, type: true, openingBalance: true, openingDate: true },
  });

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);

  // Dönem başı bakiyesi: açılıştan from-1 güne kadar (§ 11.8 md. 2).
  const beforeFrom = new Date(fromDate.getTime() - 1);
  const openingBalanceCents =
    account.openingDate.getTime() <= beforeFrom.getTime()
      ? await accountBalanceAt(accountId, beforeFrom)
      : account.openingDate.getTime() <= toDate.getTime()
        ? Number(account.openingBalance.mul(100).toFixed(0))
        : 0;

  const bookings = await db.accountingBooking.findMany({
    where: {
      reversedAt: null,
      OR: [{ accountId }, { counterAccountId: accountId }],
      bookingDate: { gte: fromDate, lte: toDate },
    },
    select: {
      id: true,
      bookingNumber: true,
      bookingDate: true,
      description: true,
      receiptReference: true,
      type: true,
      amount: true,
      accountId: true,
      counterAccountId: true,
      sequence: true,
    },
    orderBy: [{ bookingDate: "asc" }, { sequence: "asc" }],
  });

  // KARAR: ters kayıt edilmemiş fişler zaten where'de hariç; iptaller ayrıca
  // üstü çizili listelenmez (§ 11.8 md. 2 "reversed bookings are listed
  // struck-through" — SAdım: iptalleri de çekip işaretleyelim).
  const reversed = await db.accountingBooking.findMany({
    where: {
      reversedAt: { not: null },
      OR: [{ accountId }, { counterAccountId: accountId }],
      bookingDate: { gte: fromDate, lte: toDate },
    },
    select: {
      id: true,
      bookingNumber: true,
      bookingDate: true,
      description: true,
      receiptReference: true,
      type: true,
      amount: true,
      reversedAt: true,
    },
    orderBy: [{ bookingDate: "asc" }, { sequence: "asc" }],
  });

  const rows: LedgerRow[] = [];
  let running = openingBalanceCents;
  for (const booking of bookings) {
    const amountCents = Number(booking.amount.mul(100).toFixed(0));
    let delta = 0;
    if (booking.type === "INCOME" && booking.accountId === accountId) delta = amountCents;
    else if (booking.type === "EXPENSE" && booking.accountId === accountId) delta = -amountCents;
    else if (booking.type === "TRANSFER") {
      if (booking.accountId === accountId) delta = -amountCents;
      else if (booking.counterAccountId === accountId) delta = amountCents;
    }
    running += delta;
    rows.push({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      bookingDate: booking.bookingDate,
      description: booking.description,
      receiptReference: booking.receiptReference,
      type: booking.type,
      amountCents: delta,
      runningBalanceCents: running,
      reversedAt: null,
    });
  }

  // İptaller: üstü çizili satırlar (yürüyen bakiyeye ETKİSİZ).
  for (const booking of reversed) {
    rows.push({
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      bookingDate: booking.bookingDate,
      description: booking.description,
      receiptReference: booking.receiptReference,
      type: booking.type,
      amountCents: 0,
      runningBalanceCents: running,
      reversedAt: booking.reversedAt ? booking.reversedAt.toISOString() : null,
    });
  }
  rows.sort((a, b) => {
    const dateDiff = a.bookingDate.getTime() - b.bookingDate.getTime();
    if (dateDiff !== 0) return dateDiff;
    return a.bookingNumber.localeCompare(b.bookingNumber, "de");
  });

  return {
    accountId: account.id,
    accountName: account.name,
    accountType: account.type,
    from,
    to,
    openingBalanceCents,
    rows,
    closingBalanceCents: running,
  };
}

/** Proje raporu — § 11.8 md. 3. */
export async function buildProjectReport(year: number): Promise<ProjectReportRow[]> {
  const db = getDb();
  const bookings = await db.accountingBooking.findMany({
    where: { year, reversedAt: null, type: { not: "TRANSFER" }, projectId: { not: null } },
    select: {
      projectId: true,
      type: true,
      amount: true,
      project: { select: { name: true } },
    },
  });

  const totals = new Map<string, { name: string; income: number; expense: number }>();
  for (const booking of bookings) {
    if (!booking.projectId) continue;
    const entry = totals.get(booking.projectId) ?? {
      name: booking.project?.name ?? "-",
      income: 0,
      expense: 0,
    };
    const cents = Number(booking.amount.mul(100).toFixed(0));
    if (booking.type === "INCOME") entry.income += cents;
    else entry.expense += cents;
    totals.set(booking.projectId, entry);
  }

  return [...totals.entries()]
    .map(([projectId, entry]) => ({
      projectId,
      projectName: entry.name,
      incomeCents: entry.income,
      expenseCents: entry.expense,
      balanceCents: entry.income - entry.expense,
    }))
    .sort((a, b) => a.projectName.localeCompare(b.projectName, "tr"));
}

/** Belgesi eksik fiş sayısı (yıl; § 8 md. 14). */
export async function countMissingReceipts(year: number): Promise<number> {
  const db = getDb();
  const bookings = await db.accountingBooking.findMany({
    where: { year, reversedAt: null },
    select: {
      type: true,
      sourceType: true,
      _count: { select: { files: { where: { deletedAt: null } } } },
    },
  });
  return bookings.filter(
    (booking) =>
      booking.type !== "TRANSFER" &&
      !booking.sourceType &&
      booking._count.files === 0,
  ).length;
}

/** Kassenbericht (yıllık kasa raporu) verisi — § 11.8 md. 4. */
export async function buildAnnualReportData(year: number): Promise<{
  incomeExpense: IncomeExpenseReport;
  projectRows: ProjectReportRow[];
  accountBalances: Array<{ accountId: string; name: string; openingCents: number; closingCents: number }>;
  missingReceiptCount: number;
}> {
  const db = getDb();
  const [incomeExpense, projectRows, accounts, missingReceiptCount] = await Promise.all([
    buildIncomeExpenseReport(year),
    buildProjectReport(year),
    db.accountingAccount.findMany({
      where: { isActive: true },
      select: { id: true, name: true, openingDate: true },
      orderBy: { name: "asc" },
    }),
    countMissingReceipts(year),
  ]);

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const beforeYear = new Date(yearStart.getTime() - 1);
  const yearEnd = new Date(Date.UTC(year, 11, 31));

  const accountBalances: Array<{
    accountId: string;
    name: string;
    openingCents: number;
    closingCents: number;
  }> = [];
  for (const account of accounts) {
    // Yıl başı bakiyesi: hesap o yıldan önce açıldıysa önceki yıl sonu; değilse 0.
    const openingCents =
      account.openingDate.getTime() <= beforeYear.getTime()
        ? await accountBalanceAt(account.id, beforeYear)
        : 0;
    const closingCents =
      account.openingDate.getTime() <= yearEnd.getTime()
        ? await accountBalanceAt(account.id, yearEnd)
        : 0;
    accountBalances.push({ accountId: account.id, name: account.name, openingCents, closingCents });
  }

  return { incomeExpense, projectRows, accountBalances, missingReceiptCount };
}
