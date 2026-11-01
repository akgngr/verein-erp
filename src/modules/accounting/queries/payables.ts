import "server-only";

import type { PayableStatus } from "@prisma/client";

import { getDb } from "@/shared/db";

import { section14Checks, type Section14Check } from "../services/einvoice-in";
import { PAYABLE_SOURCE, payableRates } from "../services/payable-payment-service";
import { isValidIban } from "../services/sepa";

export type PayableRow = {
  id: string;
  status: PayableStatus;
  source: string;
  supplierName: string;
  number: string | null;
  issueDate: Date | null;
  dueDate: Date | null;
  grossCents: number;
  paidCents: number;
  openCents: number;
  overdue: boolean;
  hasFile: boolean;
};

export type PayableDetail = PayableRow & {
  contactId: string | null;
  supplierVatId: string | null;
  supplierTaxNumber: string | null;
  supplierAddress: string | null;
  supplierIban: string | null;
  serviceDate: string | null;
  categoryId: string | null;
  categoryName: string | null;
  byRate: Array<{ rate: number; netCents: number; taxCents: number }>;
  netCents: number;
  taxCents: number;
  notes: string | null;
  originalName: string | null;
  mimeType: string | null;
  createdByLabel: string;
  createdAt: Date;
  checks: Section14Check[];
  bookings: Array<{ id: string; bookingNumber: string; bookingDate: Date; amountCents: number; reversed: boolean }>;
};

const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

function row(item: { id: string; status: PayableStatus; source: string; supplierName: string; number: string | null; issueDate: Date | null; dueDate: Date | null; grossCents: number; paidCents: number; storagePath: string | null }): PayableRow {
  const openCents = item.status === "OPEN" ? item.grossCents - item.paidCents : 0;
  return {
    id: item.id,
    status: item.status,
    source: item.source,
    supplierName: item.supplierName,
    number: item.number,
    issueDate: item.issueDate,
    dueDate: item.dueDate,
    grossCents: item.grossCents,
    paidCents: item.paidCents,
    openCents,
    overdue: openCents > 0 && item.dueDate !== null && item.dueDate < today(),
    hasFile: Boolean(item.storagePath),
  };
}

export async function listPayables(status?: PayableStatus): Promise<{ rows: PayableRow[]; counts: Record<PayableStatus, number> }> {
  const db = getDb();
  const [items, grouped] = await Promise.all([
    db.accountingPayable.findMany({ where: status ? { status } : {}, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], take: 500 }),
    db.accountingPayable.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts = { DRAFT: 0, OPEN: 0, PAID: 0, CANCELLED: 0 } as Record<PayableStatus, number>;
  for (const group of grouped) counts[group.status] = group._count._all;
  return { rows: items.map(row), counts };
}

export async function getPayable(id: string): Promise<PayableDetail | null> {
  const db = getDb();
  const item = await db.accountingPayable.findUnique({ where: { id } });
  if (!item) return null;
  const [category, bookings] = await Promise.all([
    item.categoryId ? db.accountingCategory.findUnique({ where: { id: item.categoryId }, select: { name: true } }) : null,
    db.accountingBooking.findMany({
      where: { sourceType: PAYABLE_SOURCE, OR: [{ sourceId: item.id }, { sourceId: { startsWith: `${item.id}:` } }] },
      orderBy: { createdAt: "asc" },
      select: { id: true, bookingNumber: true, bookingDate: true, amount: true, reversedAt: true },
    }),
  ]);
  const byRate = payableRates(item.byRate);
  return {
    ...row(item),
    contactId: item.contactId,
    supplierVatId: item.supplierVatId,
    supplierTaxNumber: item.supplierTaxNumber,
    supplierAddress: item.supplierAddress,
    supplierIban: item.supplierIban,
    serviceDate: item.serviceDate,
    categoryId: item.categoryId,
    categoryName: category?.name ?? null,
    byRate,
    netCents: item.netCents,
    taxCents: item.taxCents,
    notes: item.notes,
    originalName: item.originalName,
    mimeType: item.mimeType,
    createdByLabel: item.createdByLabel,
    createdAt: item.createdAt,
    checks: section14Checks({
      sellerName: item.supplierName || null,
      sellerAddress: item.supplierAddress,
      sellerVatId: item.supplierVatId,
      sellerTaxNumber: item.supplierTaxNumber,
      number: item.number,
      issueDate: item.issueDate ? item.issueDate.toISOString().slice(0, 10) : null,
      serviceDate: item.serviceDate,
      grossCents: item.grossCents,
      byRate,
    }),
    bookings: bookings.map((booking) => ({ id: booking.id, bookingNumber: booking.bookingNumber, bookingDate: booking.bookingDate, amountCents: Number(booking.amount.mul(100).toFixed(0)), reversed: booking.reversedAt !== null })),
  };
}

/** Banka eşleştirmesi: açık gelen faturalar. */
export async function listOpenPayables(): Promise<Array<{ id: string; number: string | null; supplierName: string; openCents: number }>> {
  const items = await getDb().accountingPayable.findMany({ where: { status: "OPEN" }, select: { id: true, number: true, supplierName: true, grossCents: true, paidCents: true } });
  return items.map((item) => ({ id: item.id, number: item.number, supplierName: item.supplierName, openCents: item.grossCents - item.paidCents })).filter((item) => item.openCents > 0);
}

export async function listSupplierOptions() {
  return getDb().accountingContact.findMany({ where: { type: "SUPPLIER", isActive: true }, orderBy: { name: "asc" }, select: { id: true, number: true, name: true, address: true, vatId: true } });
}

/** ACC-6 ödeme listesi satırları: açık gelen faturalar + IBAN geçerliliği. */
export async function listPaymentRunRows(): Promise<Array<{ id: string; supplierName: string; number: string | null; dueDate: string | null; openCents: number; ibanOk: boolean }>> {
  const items = await getDb().accountingPayable.findMany({ where: { status: "OPEN" }, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] });
  return items
    .filter((item) => item.grossCents > item.paidCents)
    .map((item) => ({
      id: item.id,
      supplierName: item.supplierName,
      number: item.number,
      dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : null,
      openCents: item.grossCents - item.paidCents,
      ibanOk: Boolean(item.supplierIban && isValidIban(item.supplierIban)),
    }));
}
