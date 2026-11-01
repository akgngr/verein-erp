import "server-only";

import type { Prisma } from "@prisma/client";

import { ActionError } from "@/modules/auth/server";

import { calculateInvoiceTotals } from "./invoice-calc";
import { allocatePayment, openCents } from "./invoice-payments";
import { createSourcedBooking } from "./sourced-bookings";

export const INVOICE_SOURCE = "INVOICE";

export type InvoicePaymentInput = {
  invoiceId: string;
  paidDate: Date;
  accountId: string;
  categoryId: string;
  /** null = açık tutarın tamamı. */
  amountCents: number | null;
  closeRemainder: boolean;
  actor: { id: string; label: string };
};

/**
 * Fatura tahsilatı (ACC-3; ACC-4 banka eşleştirmesi de kullanır). Çağıranın transaction'ında
 * çalışır: tutar KDV oran paylarına bölünür, oran başına gelir fişi yazılır (sourceId: ilk fiş =
 * fatura id, sonrakiler "<id>:<n>"), ödeme satırı ve fatura toplamları güncellenir.
 */
export async function applyInvoicePayment(tx: Prisma.TransactionClient, input: InvoicePaymentInput) {
  const invoice = await tx.accountingInvoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) throw new ActionError("accounting.invoices.errors.notFound");
  if (invoice.kind !== "INVOICE" || invoice.status !== "ISSUED") throw new ActionError("accounting.invoices.errors.notPayable");
  const open = openCents(invoice);
  const amountCents = input.amountCents ?? open;
  if (amountCents <= 0 || amountCents > open) {
    throw new ActionError("accounting.invoices.errors.amountInvalid", { amount: ["accounting.invoices.errors.amountInvalid"] });
  }
  const lines = await tx.accountingInvoiceLine.findMany({ where: { invoiceId: invoice.id }, orderBy: { position: "asc" } });
  const { byRate } = calculateInvoiceTotals(lines.map((line) => ({ quantity: Number(line.quantity), unitPriceCents: line.unitPriceCents, taxRate: line.taxRate })));
  const parts = allocatePayment(byRate, amountCents).filter((part) => part.netCents + part.taxCents !== 0);
  const existing = await tx.accountingBooking.count({
    where: { sourceType: INVOICE_SOURCE, OR: [{ sourceId: invoice.id }, { sourceId: { startsWith: `${invoice.id}:` } }] },
  });
  const partial = amountCents < invoice.grossCents;
  const bookings: Array<{ id: string; bookingNumber: string }> = [];
  for (const [index, part] of parts.entries()) {
    const seq = existing + index;
    const label = [parts.length > 1 ? `${part.rate} % USt` : "", partial ? "Teilzahlung" : ""].filter(Boolean).join(", "); // i18n-ignore: Buchungstext (Almanca muhasebe kaydı)
    bookings.push(
      await createSourcedBooking({
        tx,
        actor: input.actor,
        type: "INCOME",
        sourceType: INVOICE_SOURCE,
        sourceId: seq === 0 ? invoice.id : `${invoice.id}:${seq + 1}`,
        bookingDate: input.paidDate,
        accountId: input.accountId,
        categoryId: input.categoryId,
        amountCents: part.netCents + part.taxCents,
        tax: { rate: part.rate, netCents: part.netCents, taxCents: part.taxCents },
        description: `Rechnung ${invoice.number} – ${invoice.recipientName}${label ? ` (${label})` : ""}`.slice(0, 300), // i18n-ignore: Buchungstext
        receiptReference: invoice.number,
      }),
    );
  }
  const first = bookings[0];
  if (!first) throw new ActionError("common.errors.unexpected");
  const skontoCents = input.closeRemainder ? open - amountCents : 0;
  const settled = amountCents + skontoCents === open;
  await tx.accountingInvoicePayment.create({
    data: {
      invoiceId: invoice.id,
      paidDate: input.paidDate,
      amountCents,
      skontoCents,
      accountId: input.accountId,
      bookingNumbers: bookings.map((booking) => booking.bookingNumber).join(", "),
      createdById: input.actor.id,
      createdByLabel: input.actor.label,
    },
  });
  await tx.accountingInvoice.update({
    where: { id: invoice.id },
    data: {
      paidCents: { increment: amountCents },
      skontoCents: { increment: skontoCents },
      categoryId: input.categoryId,
      bookingId: invoice.bookingId ?? first.id,
      ...(settled ? { status: "PAID" as const, paidAt: input.paidDate } : {}),
    },
  });
  return { bookingNumber: first.bookingNumber, bookingIds: bookings.map((booking) => booking.id), amountCents, skontoCents, settled };
}
