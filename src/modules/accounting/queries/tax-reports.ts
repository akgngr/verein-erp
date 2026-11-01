import "server-only";

import { getDb } from "@/shared/db";

import { checkSmallBusiness, type SmallBusinessCheck, type TaxBookingRow } from "../services/tax-reports";

const cents = (value: { mul: (n: number) => { toFixed: (d: number) => string } }) => Number(value.mul(100).toFixed(0));

/** Dönemdeki iptal edilmemiş fişler (fiş tarihi = Ist-Versteuerung'da ödeme tarihi). */
export async function listTaxRows(from: Date, to: Date): Promise<TaxBookingRow[]> {
  const rows = await getDb().accountingBooking.findMany({
    where: { reversedAt: null, bookingDate: { gte: from, lte: to } },
    orderBy: [{ bookingDate: "asc" }, { sequence: "asc" }],
    select: {
      id: true,
      bookingNumber: true,
      type: true,
      bookingDate: true,
      description: true,
      receiptReference: true,
      amount: true,
      netAmount: true,
      taxAmount: true,
      taxRate: true,
      account: { select: { name: true, accountNumber: true } },
      counterAccount: { select: { name: true, accountNumber: true } },
      category: { select: { id: true, name: true, accountNumber: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    bookingNumber: row.bookingNumber,
    type: row.type,
    bookingDate: row.bookingDate,
    description: row.description,
    receiptReference: row.receiptReference,
    amountCents: cents(row.amount),
    netCents: cents(row.netAmount),
    taxCents: cents(row.taxAmount),
    taxRate: row.taxRate,
    accountNumber: row.account.accountNumber,
    accountName: row.account.name,
    counterAccountNumber: row.counterAccount?.accountNumber ?? null,
    counterAccountName: row.counterAccount?.name ?? null,
    categoryId: row.category?.id ?? null,
    categoryName: row.category?.name ?? null,
    categoryNumber: row.category?.accountNumber ?? null,
  }));
}

/** DATEV Kontenbeschriftungen: numarası olan tüm hesap ve kategoriler. */
export async function listAccountLabels(): Promise<Array<{ number: string; name: string }>> {
  const db = getDb();
  const [accounts, categories] = await Promise.all([
    db.accountingAccount.findMany({ where: { accountNumber: { not: null } }, select: { accountNumber: true, name: true } }),
    db.accountingCategory.findMany({ where: { accountNumber: { not: null } }, select: { accountNumber: true, name: true } }),
  ]);
  return [...accounts, ...categories].map((item) => ({ number: item.accountNumber as string, name: item.name }));
}

/**
 * § 19 UStG Richtwert: aidat ve bağış aktarımları HARİÇ gelirlerin net toplamı (önceki/cari yıl).
 * Kesin Umsatz tanımı vergi danışmanıyla doğrulanmalı; ekranda "Richtwert" olarak gösterilir.
 */
export async function getSmallBusinessCheck(year: number): Promise<SmallBusinessCheck> {
  const db = getDb();
  const sumFor = async (target: number) => {
    const result = await db.accountingBooking.aggregate({
      where: {
        year: target,
        type: "INCOME",
        reversedAt: null,
        OR: [{ sourceType: null }, { sourceType: { notIn: ["MEMBER_PAYMENT", "DONATION", "DONATION_WAIVER"] } }],
      },
      _sum: { netAmount: true },
    });
    return result._sum.netAmount ? cents(result._sum.netAmount) : 0;
  };
  const [previous, current] = await Promise.all([sumFor(year - 1), sumFor(year)]);
  return checkSmallBusiness(previous, current);
}
