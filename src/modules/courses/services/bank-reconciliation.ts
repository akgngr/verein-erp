import "server-only";

import type { Prisma } from "@prisma/client";

import { ActionError } from "@/modules/auth/server";
import { getDb } from "@/shared/db";

import { bookCoursePaymentDetailed, chargeBookingLabel } from "./fee-bookings";

export interface OpenCourseChargeForBankMatch {
  chargeId: string;
  courseCode: string;
  courseTitle: string;
  label: string;
  dueDate: string;
  amountCents: number;
  studentLabel: string;
  studentNumber: string | null;
  payerLabel: string | null;
  payerDebtorNumber: number | null;
}

export async function listOpenCourseChargesForBankMatch(): Promise<
  OpenCourseChargeForBankMatch[]
> {
  const rows = await getDb().courseCharge.findMany({
    where: {
      status: "OPEN",
      amountCents: { gt: 0 },
      enrollment: { course: { deletedAt: null } },
    },
    include: {
      enrollment: {
        select: {
          studentLabel: true,
          studentNumber: true,
          payerLabel: true,
          payerDebtorNumber: true,
          course: { select: { code: true, title: true } },
        },
      },
    },
    orderBy: [{ dueDate: "asc" }],
    take: 5000,
  });

  return rows.map((row) => ({
    chargeId: row.id,
    courseCode: row.enrollment.course.code,
    courseTitle: row.enrollment.course.title,
    label: chargeBookingLabel(row),
    dueDate: row.dueDate.toISOString().slice(0, 10),
    amountCents: row.amountCents,
    studentLabel: row.enrollment.studentLabel,
    studentNumber: row.enrollment.studentNumber,
    payerLabel: row.enrollment.payerLabel,
    payerDebtorNumber: row.enrollment.payerDebtorNumber,
  }));
}

/**
 * Atomically claims an OPEN CourseCharge -> PAID, records a BANK_TRANSFER
 * CoursePayment, and books the sourced accounting entry on `input.accountId`.
 */
export async function recordBankCourseChargePayment(
  input: {
    chargeId: string;
    paidAt: Date;
    accountId: string;
    amountCents: number;
    reference: string | null;
    actor: { id: string; label: string };
  },
  tx: Prisma.TransactionClient,
): Promise<{ paymentId: string; bookingId: string; bookingNumber: string }> {
  const charge = await tx.courseCharge.findUnique({
    where: { id: input.chargeId },
    include: {
      enrollment: {
        select: {
          payerDebtorNumber: true,
          course: { select: { code: true, deletedAt: true } },
        },
      },
    },
  });

  if (!charge || charge.enrollment.course.deletedAt) {
    throw new ActionError("accounting.bank.errors.courseChargeNotFound");
  }
  if (charge.status !== "OPEN") {
    throw new ActionError("accounting.bank.errors.courseChargeAlreadySettled");
  }
  if (charge.amountCents !== input.amountCents) {
    throw new ActionError("accounting.bank.errors.courseChargeAmountMismatch");
  }

  const claimed = await tx.courseCharge.updateMany({
    where: { id: charge.id, status: "OPEN" },
    data: { status: "PAID" },
  });
  if (claimed.count !== 1) {
    throw new ActionError("accounting.bank.errors.courseChargeAlreadySettled");
  }

  const settings = await tx.coursesSettings.findUnique({
    where: { id: "singleton" },
  });

  const payment = await tx.coursePayment.create({
    data: {
      chargeId: charge.id,
      paidAt: input.paidAt,
      method: "BANK_TRANSFER",
      amountCents: charge.amountCents,
      reference: input.reference?.slice(0, 120) ?? null,
      recordedById: input.actor.id,
      recordedByLabel: input.actor.label,
    },
  });

  const { bookingId, bookingNumber } = await bookCoursePaymentDetailed(tx, {
    actor: input.actor,
    paymentId: payment.id,
    incomeCategoryId: settings?.incomeCategoryId ?? null,
    method: "BANK_TRANSFER",
    paidAt: input.paidAt,
    amountCents: charge.amountCents,
    courseCode: charge.enrollment.course.code,
    debtorNumber: charge.enrollment.payerDebtorNumber,
    chargeLabel: chargeBookingLabel(charge),
    accountId: input.accountId,
  });

  await tx.coursePayment.update({
    where: { id: payment.id },
    data: { bookingNumber },
  });

  return { paymentId: payment.id, bookingId, bookingNumber };
}
