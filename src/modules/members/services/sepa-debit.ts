import "server-only";

import type { Prisma } from "@prisma/client";

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
 * İsteğe bağlı `tx` verilirse çağıranın transaction'ı içinde atomik çalışır.
 */
export async function recordSepaDuePayments(
  items: { memberId: string; year: number; amountCents: number; reference: string }[],
  paidAt: Date,
  actor: { id: string; label: string },
  externalTx?: Prisma.TransactionClient,
): Promise<Record<string, string>> {
  const db = getDb();
  const out: Record<string, string> = {};
  const year = paidAt.getUTCFullYear();

  const applyOne = async (
    tx: Prisma.TransactionClient,
    item: { memberId: string; year: number; amountCents: number; reference: string },
  ): Promise<string> => {
    const existing = await tx.memberPayment.findFirst({
      where: { memberId: item.memberId, dueYear: item.year, reference: item.reference, voidedAt: null },
      select: { receiptNumber: true },
    });
    if (existing) return existing.receiptNumber;
    const { sequence, receiptNumber } = await allocateReceiptNumber(tx, year);
    const created = await tx.memberPayment.create({
      data: {
        year,
        sequence,
        receiptNumber,
        memberId: item.memberId,
        dueYear: item.year,
        amount: centsToDecimalString(item.amountCents),
        method: "SEPA_DEBIT",
        paidAt,
        reference: item.reference,
        createdById: actor.id,
        createdByLabel: actor.label,
      },
    });
    await recalculateDueStatus(tx, item.memberId, item.year);
    return created.receiptNumber;
  };

  for (const item of items) {
    out[item.reference] = externalTx
      ? await applyOne(externalTx, item)
      : await runWithReceiptNumberRetry(() => db.$transaction((tx) => applyOne(tx, item)));
  }
  return out;
}

/** Geri dönen (Rücklastschrift) kalemin ödemesini iptal eder; aidat yeniden açılır. */
export async function voidSepaDuePayment(
  memberId: string,
  year: number,
  reference: string,
  reason: string,
  actor: { id: string; label: string },
  externalTx?: Prisma.TransactionClient,
): Promise<boolean> {
  const run = async (tx: Prisma.TransactionClient) => {
    const payment = await tx.memberPayment.findFirst({ where: { memberId, dueYear: year, reference, voidedAt: null }, select: { id: true } });
    if (!payment) return false;
    await tx.memberPayment.update({ where: { id: payment.id }, data: { voidedAt: new Date(), voidedById: actor.id, voidedByLabel: actor.label, voidReason: reason } });
    await recalculateDueStatus(tx, memberId, year);
    return true;
  };
  return externalTx ? run(externalTx) : getDb().$transaction(run);
}
