import "server-only";

import type { InvoiceKind, InvoiceStatus } from "@prisma/client";

import { getDb } from "@/shared/db";

import { aging, openCents, type AgingBucket } from "../services/invoice-payments";

export type InvoiceListRow = {
  id: string;
  kind: InvoiceKind;
  status: InvoiceStatus;
  number: string | null;
  issueDate: Date;
  dueDate: Date | null;
  recipientName: string;
  subject: string | null;
  grossCents: number;
  overdue: boolean;
  /** ACC-3: tahsil edilen + Skonto; açık tutar. */
  paidCents: number;
  skontoCents: number;
  openCents: number;
};

export type InvoicePaymentRow = { id: string; paidDate: Date; amountCents: number; skontoCents: number; bookingNumbers: string; createdByLabel: string };

export type InvoiceLineRow = {
  id: string;
  position: number;
  description: string;
  quantity: number;
  unit: string | null;
  unitPriceCents: number;
  taxRate: number;
  totalCents: number;
};

export type InvoiceDetail = InvoiceListRow & {
  serviceDate: string | null;
  recipientAddress: string | null;
  recipientEmail: string | null;
  introText: string | null;
  footerText: string | null;
  taxNote: string | null;
  netCents: number;
  taxCents: number;
  categoryId: string | null;
  bookingId: string | null;
  bookingNumber: string | null;
  sourceProformaId: string | null;
  sourceProformaNumber: string | null;
  convertedInvoiceId: string | null;
  issuedAt: Date | null;
  paidAt: Date | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdByLabel: string;
  createdAt: Date;
  lines: InvoiceLineRow[];
  contactId: string | null;
  contactNumber: number | null;
  buyerReference: string | null;
  payments: InvoicePaymentRow[];
};

export type InvoiceSettingsData = {
  defaultTaxRate: number;
  taxNote: string | null;
  paymentDays: number;
  bankDetails: string | null;
  footerText: string | null;
  incomeCategoryId: string | null;
  sellerVatId: string | null;
  iban: string | null;
  bic: string | null;
};

const isOverdue = (status: InvoiceStatus, dueDate: Date | null) =>
  status === "ISSUED" && dueDate !== null && dueDate.getTime() < Date.now() - 24 * 60 * 60 * 1000;

export async function listInvoices(filters: { kind?: string; status?: string; q?: string }): Promise<InvoiceListRow[]> {
  const q = filters.q?.trim();
  const rows = await getDb().accountingInvoice.findMany({
    where: {
      ...(filters.kind === "INVOICE" || filters.kind === "PROFORMA" || filters.kind === "QUOTE" ? { kind: filters.kind } : {}),
      ...(filters.status && ["DRAFT", "ISSUED", "PAID", "CANCELLED"].includes(filters.status) ? { status: filters.status as InvoiceStatus } : {}),
      ...(q
        ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { recipientName: { contains: q, mode: "insensitive" } }, { subject: { contains: q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: 500,
  });
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind,
    status: row.status,
    number: row.number,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    recipientName: row.recipientName,
    subject: row.subject,
    grossCents: row.grossCents,
    overdue: isOverdue(row.status, row.dueDate),
    paidCents: row.paidCents,
    skontoCents: row.skontoCents,
    openCents: row.status === "ISSUED" && row.kind === "INVOICE" ? openCents(row) : 0,
  }));
}

export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  const db = getDb();
  const row = await db.accountingInvoice.findUnique({ where: { id }, include: { lines: { orderBy: { position: "asc" } }, payments: { orderBy: { createdAt: "asc" } }, contact: { select: { number: true } } } });
  if (!row) return null;
  const [booking, proforma, converted] = await Promise.all([
    row.bookingId ? db.accountingBooking.findUnique({ where: { id: row.bookingId }, select: { bookingNumber: true } }) : null,
    row.sourceProformaId ? db.accountingInvoice.findUnique({ where: { id: row.sourceProformaId }, select: { number: true } }) : null,
    row.kind === "PROFORMA" || row.kind === "QUOTE" ? db.accountingInvoice.findFirst({ where: { sourceProformaId: row.id }, select: { id: true } }) : null,
  ]);
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    number: row.number,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    recipientName: row.recipientName,
    subject: row.subject,
    grossCents: row.grossCents,
    overdue: isOverdue(row.status, row.dueDate),
    paidCents: row.paidCents,
    skontoCents: row.skontoCents,
    openCents: row.status === "ISSUED" && row.kind === "INVOICE" ? openCents(row) : 0,
    contactId: row.contactId,
    buyerReference: row.buyerReference,
    contactNumber: row.contact?.number ?? null,
    payments: row.payments.map((payment) => ({
      id: payment.id,
      paidDate: payment.paidDate,
      amountCents: payment.amountCents,
      skontoCents: payment.skontoCents,
      bookingNumbers: payment.bookingNumbers,
      createdByLabel: payment.createdByLabel,
    })),
    serviceDate: row.serviceDate,
    recipientAddress: row.recipientAddress,
    recipientEmail: row.recipientEmail,
    introText: row.introText,
    footerText: row.footerText,
    taxNote: row.taxNote,
    netCents: row.netCents,
    taxCents: row.taxCents,
    categoryId: row.categoryId,
    bookingId: row.bookingId,
    bookingNumber: booking?.bookingNumber ?? null,
    sourceProformaId: row.sourceProformaId,
    sourceProformaNumber: proforma?.number ?? null,
    convertedInvoiceId: converted?.id ?? null,
    issuedAt: row.issuedAt,
    paidAt: row.paidAt,
    cancelledAt: row.cancelledAt,
    cancelReason: row.cancelReason,
    createdByLabel: row.createdByLabel,
    createdAt: row.createdAt,
    lines: row.lines.map((line) => ({
      id: line.id,
      position: line.position,
      description: line.description,
      quantity: Number(line.quantity),
      unit: line.unit,
      unitPriceCents: line.unitPriceCents,
      taxRate: line.taxRate,
      totalCents: line.totalCents,
    })),
  };
}

export async function getInvoiceSettings(): Promise<InvoiceSettingsData> {
  const row = await getDb().accountingInvoiceSettings.findUnique({ where: { id: "singleton" } });
  return {
    defaultTaxRate: row?.defaultTaxRate ?? 0,
    taxNote: row?.taxNote ?? null,
    paymentDays: row?.paymentDays ?? 14,
    bankDetails: row?.bankDetails ?? null,
    footerText: row?.footerText ?? null,
    incomeCategoryId: row?.incomeCategoryId ?? null,
    sellerVatId: row?.sellerVatId ?? null,
    iban: row?.iban ?? null,
    bic: row?.bic ?? null,
  };
}

export type OpenItemRow = {
  id: string;
  number: string | null;
  recipientName: string;
  contactNumber: number | null;
  issueDate: Date;
  dueDate: Date;
  grossCents: number;
  openCents: number;
  daysOverdue: number;
  bucket: AgingBucket;
};

/** ACC-3 OPOS: kesinleşmiş, kapanmamış faturalar; vade (yoksa fatura tarihi) bazlı yaşlandırma. */
export async function listOpenItems(today: Date): Promise<OpenItemRow[]> {
  const rows = await getDb().accountingInvoice.findMany({
    where: { kind: "INVOICE", status: "ISSUED" },
    orderBy: [{ dueDate: "asc" }, { issueDate: "asc" }],
    include: { contact: { select: { number: true } } },
  });
  return rows
    .map((row) => {
      const due = row.dueDate ?? row.issueDate;
      const { daysOverdue, bucket } = aging(due, today);
      return {
        id: row.id,
        number: row.number,
        recipientName: row.recipientName,
        contactNumber: row.contact?.number ?? null,
        issueDate: row.issueDate,
        dueDate: due,
        grossCents: row.grossCents,
        openCents: openCents(row),
        daysOverdue,
        bucket,
      };
    })
    .filter((row) => row.openCents > 0);
}
