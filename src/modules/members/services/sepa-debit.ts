import "server-only";

import { getDb } from "@/shared/db";
import { centsToDecimalString } from "@/shared/money";

import { recalculateDueStatus } from "./dues-calculation";
import { allocateReceiptNumber, runWithReceiptNumberRetry } from "./receipt-number";

/** SEPA modülü için: bir yılın açık aidatları ve yetki bilgisi (yetkisi olmayanlar da döner; çağıran ayırır). */
export type DebitableDue = {
  memberId: string;
  membershipNumber: string;
  name: string;
  year: number;
  openCents: number;
  iban: string | null;
  bic: string | null;
  accountHolder: string | null;
  mandateReference: string | null;
  mandateDate: string | null;
};

export async function listDebitableDues(year: number): Promise<DebitableDue[]> {
  const db = getDb();
  const dues = await db.memberDue.findMany({
    where: { year, status: { in: ["OPEN", "PARTIAL"] }, member: { deletedAt: null, status: { in: ["ACTIVE", "PASSIVE"] } } },
    select: { memberId: true, amountDue: true, member: { select: { membershipNumber: true, firstName: true, lastName: true, sepaIban: true, sepaBic: true, sepaAccountHolder: true, sepaMandateReference: true, sepaMandateDate: true } } },
    orderBy: { member: { membershipNumber: "asc" } },
    take: 5000,
  });
  const paid = await db.memberPayment.groupBy({ by: ["memberId"], where: { dueYear: year, voidedAt: null, memberId: { in: dues.map((due) => due.memberId) } }, _sum: { amount: true } });
  const paidBy = new Map(paid.map((row) => [row.memberId, Math.round(Number(row._sum.amount ?? 0) * 100)]));
  return dues
    .map((due) => ({
      memberId: due.memberId,
      membershipNumber: due.member.membershipNumber,
      name: `${due.member.firstName} ${due.member.lastName}`.trim(),
      year,
      openCents: Math.round(Number(due.amountDue) * 100) - (paidBy.get(due.memberId) ?? 0),
      iban: due.member.sepaIban,
      bic: due.member.sepaBic,
      accountHolder: due.member.sepaAccountHolder,
      mandateReference: due.member.sepaMandateReference,
      mandateDate: due.member.sepaMandateDate?.toISOString().slice(0, 10) ?? null,
    }))
    .filter((due) => due.openCents > 0);
}

/**
 * Tahsil edilen SEPA kalemlerini aidat ödemesi olarak kaydeder (makbuz numarasıyla) ve aidat durumunu günceller.
 * Aynı referansla daha önce kaydedilmiş kalem atlanır (çift kayıt yok). Döner: oluşan makbuz numaraları.
 */
export async function recordSepaDuePayments(items: { memberId: string; year: number; amountCents: number; reference: string }[], paidAt: Date, actor: { id: string; label: string }): Promise<Record<string, string>> {
  const db = getDb();
  const out: Record<string, string> = {};
  for (const item of items) {
    const existing = await db.memberPayment.findFirst({ where: { memberId: item.memberId, dueYear: item.year, reference: item.reference, voidedAt: null }, select: { receiptNumber: true } });
    if (existing) {
      out[item.reference] = existing.receiptNumber;
      continue;
    }
    const year = paidAt.getUTCFullYear();
    const payment = await runWithReceiptNumberRetry(() =>
      db.$transaction(async (tx) => {
        const { sequence, receiptNumber } = await allocateReceiptNumber(tx, year);
        const created = await tx.memberPayment.create({
          data: { year, sequence, receiptNumber, memberId: item.memberId, dueYear: item.year, amount: centsToDecimalString(item.amountCents), method: "SEPA_DEBIT", paidAt, reference: item.reference, createdById: actor.id, createdByLabel: actor.label },
        });
        await recalculateDueStatus(tx, item.memberId, item.year);
        return created;
      }),
    );
    out[item.reference] = payment.receiptNumber;
  }
  return out;
}

/** Geri dönen (Rücklastschrift) kalemin ödemesini iptal eder; aidat yeniden açılır. */
export async function voidSepaDuePayment(memberId: string, year: number, reference: string, reason: string, actor: { id: string; label: string }): Promise<boolean> {
  const db = getDb();
  const payment = await db.memberPayment.findFirst({ where: { memberId, dueYear: year, reference, voidedAt: null }, select: { id: true } });
  if (!payment) return false;
  await db.$transaction(async (tx) => {
    await tx.memberPayment.update({ where: { id: payment.id }, data: { voidedAt: new Date(), voidedById: actor.id, voidedByLabel: actor.label, voidReason: reason } });
    await recalculateDueStatus(tx, memberId, year);
  });
  return true;
}
