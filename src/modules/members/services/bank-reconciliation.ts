import "server-only";

import type { Prisma } from "@prisma/client";

import { ActionError } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import { centsToDecimalString } from "@/shared/money";

import { decimalToCents, recalculateDueStatus } from "./dues-calculation";
import { checkDueOverpayment } from "./dues-rules";
import { allocateReceiptNumber } from "./receipt-number";

export interface OpenMemberDueForBankMatch {
  dueId: string;
  memberId: string;
  year: number;
  membershipNumber: string;
  name: string;
  openCents: number;
  iban: string | null;
  accountHolder: string | null;
  mandateReference: string | null;
}

export async function listOpenMemberDuesForBankMatch(): Promise<
  OpenMemberDueForBankMatch[]
> {
  const db = getDb();
  const dues = await db.memberDue.findMany({
    where: {
      status: { in: ["OPEN", "PARTIAL"] },
      member: { deletedAt: null, status: { in: ["ACTIVE", "PASSIVE"] } },
    },
    select: {
      id: true,
      memberId: true,
      year: true,
      amountDue: true,
      member: {
        select: {
          membershipNumber: true,
          firstName: true,
          lastName: true,
          sepaIban: true,
          sepaAccountHolder: true,
          sepaMandateReference: true,
        },
      },
    },
    orderBy: [{ year: "desc" }, { member: { membershipNumber: "asc" } }],
    take: 5000,
  });

  if (dues.length === 0) return [];

  const memberIds = Array.from(new Set(dues.map((d) => d.memberId)));
  const years = Array.from(new Set(dues.map((d) => d.year)));
  const paidRows = await db.memberPayment.groupBy({
    by: ["memberId", "dueYear"],
    where: {
      memberId: { in: memberIds },
      dueYear: { in: years },
      voidedAt: null,
    },
    _sum: { amount: true },
  });

  const paidMap = new Map(
    paidRows.map((row) => [
      `${row.memberId}:${row.dueYear}`,
      decimalToCents(row._sum.amount),
    ]),
  );

  return dues
    .map((due) => {
      const dueCents = decimalToCents(due.amountDue);
      const alreadyPaidCents = paidMap.get(`${due.memberId}:${due.year}`) ?? 0;
      const openCents = dueCents - alreadyPaidCents;
      return {
        dueId: due.id,
        memberId: due.memberId,
        year: due.year,
        membershipNumber: due.member.membershipNumber,
        name: `${due.member.firstName} ${due.member.lastName}`.trim(),
        openCents,
        iban: due.member.sepaIban,
        accountHolder: due.member.sepaAccountHolder,
        mandateReference: due.member.sepaMandateReference,
      };
    })
    .filter((item) => item.openCents > 0);
}

/**
 * Records a bank-statement member dues payment inside the caller's Prisma
 * transaction (`tx`), enforcing overpayment checks and recalculating due status.
 */
export async function recordBankDuePayment(
  input: {
    dueId: string;
    amountCents: number;
    paidAt: Date;
    reference: string | null;
    actor: { id: string; label: string };
  },
  tx: Prisma.TransactionClient,
): Promise<{
  paymentId: string;
  receiptNumber: string;
  membershipNumber: string;
  dueYear: number;
}> {
  if (input.amountCents <= 0) {
    throw new ActionError("accounting.bank.errors.memberDueNeedsCredit");
  }

  const due = await tx.memberDue.findUnique({
    where: { id: input.dueId },
    select: {
      id: true,
      memberId: true,
      year: true,
      amountDue: true,
      status: true,
      member: { select: { membershipNumber: true, deletedAt: true } },
    },
  });
  if (!due || due.member.deletedAt) {
    throw new ActionError("accounting.bank.errors.memberDueNotFound");
  }
  if (due.status === "PAID" || due.status === "WAIVED") {
    throw new ActionError("accounting.bank.errors.memberDueAlreadySettled");
  }

  const agg = await tx.memberPayment.aggregate({
    where: { memberId: due.memberId, dueYear: due.year, voidedAt: null },
    _sum: { amount: true },
  });
  const dueCents = decimalToCents(due.amountDue);
  const alreadyPaidCents = decimalToCents(agg._sum.amount);
  const overpayment = checkDueOverpayment(
    dueCents,
    alreadyPaidCents,
    input.amountCents,
  );
  if (!overpayment.ok) {
    throw new ActionError("accounting.bank.errors.memberDueOverpayment");
  }

  const receiptYear = input.paidAt.getUTCFullYear();
  const { sequence, receiptNumber } = await allocateReceiptNumber(tx, receiptYear);

  const created = await tx.memberPayment.create({
    data: {
      year: receiptYear,
      sequence,
      receiptNumber,
      memberId: due.memberId,
      dueYear: due.year,
      amount: centsToDecimalString(input.amountCents),
      method: "BANK_TRANSFER",
      paidAt: input.paidAt,
      reference: input.reference?.slice(0, 120) ?? null,
      createdById: input.actor.id,
      createdByLabel: input.actor.label,
    },
  });

  await recalculateDueStatus(tx, due.memberId, due.year);

  return {
    paymentId: created.id,
    receiptNumber: created.receiptNumber,
    membershipNumber: due.member.membershipNumber,
    dueYear: due.year,
  };
}
