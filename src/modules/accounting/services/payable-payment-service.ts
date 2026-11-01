import "server-only";

import type { Prisma } from "@prisma/client";

import { ActionError } from "@/modules/auth/server";

import { allocatePayment, type RateGroup } from "./invoice-payments";
import { createSourcedBooking } from "./sourced-bookings";

export const PAYABLE_SOURCE = "PAYABLE";

export function payableRates(value: unknown): RateGroup[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({ rate: Number(item?.rate ?? 0), netCents: Number(item?.netCents ?? 0), taxCents: Number(item?.taxCents ?? 0) }))
    .filter((item) => Number.isFinite(item.netCents) && Number.isFinite(item.taxCents));
}

/**
 * Gelen fatura ödemesi (ACC-5; banka eşleştirmesi de kullanır). Tutar oran paylarına bölünür,
 * oran başına GİDER fişi yazılır (Vorsteuer ayrı). sourceId: ilk fiş = id, sonrakiler "<id>:<n>".
 */
export async function applyPayablePayment(
  tx: Prisma.TransactionClient,
  input: { payableId: string; paidDate: Date; accountId: string; amountCents: number | null; actor: { id: string; label: string } },
) {
  const payable = await tx.accountingPayable.findUnique({ where: { id: input.payableId } });
  if (!payable) throw new ActionError("accounting.payables.errors.notFound");
  if (payable.status !== "OPEN") throw new ActionError("accounting.payables.errors.notPayable");
  if (!payable.categoryId) throw new ActionError("accounting.validation.categoryRequired");
  const open = payable.grossCents - payable.paidCents;
  const amountCents = input.amountCents ?? open;
  if (amountCents <= 0 || amountCents > open) {
    throw new ActionError("accounting.invoices.errors.amountInvalid", { amount: ["accounting.invoices.errors.amountInvalid"] });
  }
  const parts = allocatePayment(payableRates(payable.byRate), amountCents).filter((part) => part.netCents + part.taxCents !== 0);
  const existing = await tx.accountingBooking.count({
    where: { sourceType: PAYABLE_SOURCE, OR: [{ sourceId: payable.id }, { sourceId: { startsWith: `${payable.id}:` } }] },
  });
  const bookings: Array<{ id: string; bookingNumber: string }> = [];
  for (const [index, part] of parts.entries()) {
    const seq = existing + index;
    bookings.push(
      await createSourcedBooking({
        tx,
        actor: input.actor,
        type: "EXPENSE",
        sourceType: PAYABLE_SOURCE,
        sourceId: seq === 0 ? payable.id : `${payable.id}:${seq + 1}`,
        bookingDate: input.paidDate,
        accountId: input.accountId,
        categoryId: payable.categoryId,
        amountCents: part.netCents + part.taxCents,
        tax: { rate: part.rate, netCents: part.netCents, taxCents: part.taxCents },
        description: `${payable.supplierName}${payable.number ? ` – ${payable.number}` : ""}${parts.length > 1 ? ` (${part.rate} % USt)` : ""}`.slice(0, 300), // i18n-ignore: Buchungstext
        receiptReference: payable.number?.slice(0, 100) ?? null,
      }),
    );
  }
  const first = bookings[0];
  if (!first) throw new ActionError("common.errors.unexpected");
  const settled = amountCents === open;
  await tx.accountingPayable.update({
    where: { id: payable.id },
    data: { paidCents: { increment: amountCents }, ...(settled ? { status: "PAID", paidAt: input.paidDate } : {}) },
  });
  return { bookingNumber: first.bookingNumber, bookingIds: bookings.map((booking) => booking.id), amountCents, settled };
}
