import "server-only";

import type { InvoiceKind, Prisma } from "@prisma/client";

import { INVOICE_NUMBER_PREFIX } from "../constants";

/** Fatura numarası: R-2026-0001 / proforma PF-2026-0001 (yıl ve tür başına boşluksuz). */
export function formatInvoiceNumber(kind: InvoiceKind, year: number, sequence: number): string {
  return `${INVOICE_NUMBER_PREFIX[kind]}-${year}-${String(sequence).padStart(4, "0")}`;
}

/** Atomik sayaç; kesinleştirme transaction'ı İÇİNDE çağrılmalıdır. */
export async function allocateInvoiceNumber(
  tx: Prisma.TransactionClient,
  kind: InvoiceKind,
  year: number,
): Promise<{ sequence: number; number: string }> {
  const counter = await tx.accountingInvoiceCounter.upsert({
    where: { kind_year: { kind, year } },
    update: { lastSeq: { increment: 1 } },
    create: { kind, year, lastSeq: 1 },
  });
  return { sequence: counter.lastSeq, number: formatInvoiceNumber(kind, year, counter.lastSeq) };
}
