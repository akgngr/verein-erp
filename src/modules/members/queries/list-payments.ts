import "server-only";

import { getDb } from "@/shared/db";

import type { PaymentRow } from "../types";

/**
 * Bir üyenin ödemeleri (Faz 4, 4.6 — üye detay paneli). Tüm ödemeler döner;
 * iptal edilenler de (panelde üstü çizili gösterilir).
 */
export async function listMemberPayments(memberId: string): Promise<PaymentRow[]> {
  const rows = await getDb().memberPayment.findMany({
    where: { memberId },
    orderBy: [{ paidAt: "desc" }, { receiptNumber: "desc" }],
    select: {
      id: true,
      receiptNumber: true,
      dueYear: true,
      amount: true,
      method: true,
      paidAt: true,
      reference: true,
      voidedAt: true,
      voidReason: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    receiptNumber: row.receiptNumber,
    dueYear: row.dueYear,
    amountCents: Number(row.amount.mul(100).toFixed(0)),
    method: row.method,
    paidAt: row.paidAt.toISOString().slice(0, 10),
    reference: row.reference,
    voidedAt: row.voidedAt ? row.voidedAt.toISOString() : null,
    voidReason: row.voidReason,
  }));
}
