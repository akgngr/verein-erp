import "server-only";

import { getDb } from "@/shared/db";

import { calculateInvoiceTotals } from "../services/invoice-calc";
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
 * UStVA kaynak satırları: IST yönteminde ödeme (fiş) tarihi esas alınır; SOLL yönteminde
 * (§ 16 UStG) fatura kaynaklı çıkış KDV'si fatura düzenleme tarihine göre (INVOICE +, CREDIT_NOTE −),
 * fatura dışı gelir fişleri ve tüm gider (Vorsteuer) fişleri fiş tarihine göre alınır.
 */
export async function listUstvaRows(
  from: Date,
  to: Date,
  taxMethod: "IST" | "SOLL",
): Promise<TaxBookingRow[]> {
  const bookingRows = await listTaxRows(from, to);
  if (taxMethod !== "SOLL") return bookingRows;

  const db = getDb();
  const [invoiceBookings, invoices] = await Promise.all([
    db.accountingBooking.findMany({
      where: { reversedAt: null, type: "INCOME", sourceType: "INVOICE", bookingDate: { gte: from, lte: to } },
      select: { id: true },
    }),
    db.accountingInvoice.findMany({
      where: {
        kind: { in: ["INVOICE", "CREDIT_NOTE"] },
        number: { not: null },
        status: { not: "DRAFT" },
        issueDate: { gte: from, lte: to },
      },
      include: { lines: { orderBy: { position: "asc" } } },
      orderBy: [{ issueDate: "asc" }, { number: "asc" }],
    }),
  ]);

  const invoiceBookingIds = new Set(invoiceBookings.map((b) => b.id));
  const nonInvoicePaymentRows = bookingRows.filter((row) => !invoiceBookingIds.has(row.id));

  const sollInvoiceRows: TaxBookingRow[] = [];
  for (const inv of invoices) {
    const sign = inv.kind === "CREDIT_NOTE" ? -1 : 1;
    const { byRate } = calculateInvoiceTotals(
      inv.lines.map((line) => ({
        quantity: Number(line.quantity),
        unitPriceCents: line.unitPriceCents,
        taxRate: line.taxRate,
      })),
    );
    for (const part of byRate) {
      if (part.rate <= 0) continue;
      const netCents = sign * part.netCents;
      const taxCents = sign * part.taxCents;
      sollInvoiceRows.push({
        id: `inv:${inv.id}:${part.rate}`,
        bookingNumber: inv.number ?? inv.id,
        type: "INCOME",
        bookingDate: inv.issueDate,
        description: `${inv.kind === "CREDIT_NOTE" ? "Storno" : "Rechnung"} ${inv.number ?? ""} – ${inv.recipientName}`.trim(), // i18n-ignore: Buchungstext
        receiptReference: inv.number,
        amountCents: netCents + taxCents,
        netCents,
        taxCents,
        taxRate: part.rate,
        accountNumber: null,
        accountName: "",
        counterAccountNumber: null,
        counterAccountName: null,
        categoryId: inv.categoryId,
        categoryName: null,
        categoryNumber: null,
      });
    }
  }

  return [...nonInvoicePaymentRows, ...sollInvoiceRows];
}

/**
 * § 19 UStG Richtwert: aidat, bağış ve ideeller Bereich gelirleri HARİÇ gelirlerin net toplamı (önceki/cari yıl).
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
        AND: [
          { OR: [{ sourceType: null }, { sourceType: { notIn: ["MEMBER_PAYMENT", "DONATION", "DONATION_WAIVER"] } }] },
          { OR: [{ categoryId: null }, { category: { sphere: { not: "IDEELL" } } }] },
        ],
      },
      _sum: { netAmount: true },
    });
    return result._sum.netAmount ? cents(result._sum.netAmount) : 0;
  };
  const [previous, current] = await Promise.all([sumFor(year - 1), sumFor(year)]);
  return checkSmallBusiness(previous, current);
}
