"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { courseFeesPermissions } from "../permissions";
import { paymentSchema, reversePaymentSchema, settingsSchema, waiveChargeSchema } from "../schemas/enrollment";
import { bookCoursePayment, chargeBookingLabel, reverseCoursePaymentBooking } from "../services/fee-bookings";
import { parseDateOnly } from "../utils";

/** Ücret kalemini tahsil eder: atomik durum kilidi + ödeme kaydı + muhasebe gelir fişi tek transaction'da (#579). */
export async function recordPaymentAction(input: unknown): Promise<ActionResult<{ bookingNumber: string }>> {
  const run = createAction({
    permission: { definition: courseFeesPermissions, action: "create" },
    schema: paymentSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const actor = { id: user.id, label: buildUserLabel(user.name, user.email) };
      const paidAt = parseDateOnly(input.paidAt)!;

      const result = await db.$transaction(async (tx) => {
        const charge = await tx.courseCharge.findUnique({
          where: { id: input.chargeId },
          include: { enrollment: { include: { course: { select: { code: true } } } } },
        });
        if (!charge) throw new ActionError("courses.errors.chargeNotFound");

        // Atomic status claim prevents concurrent double-payment and duplicate accounting bookings.
        const claimed = await tx.courseCharge.updateMany({
          where: { id: charge.id, status: "OPEN" },
          data: { status: "PAID" },
        });
        if (claimed.count !== 1) throw new ActionError("courses.errors.chargeNotOpen");

        const settings = await tx.coursesSettings.findUnique({ where: { id: "singleton" } });
        const payment = await tx.coursePayment.create({
          data: {
            chargeId: charge.id,
            paidAt,
            method: input.method,
            amountCents: charge.amountCents,
            reference: input.reference || null,
            recordedById: actor.id,
            recordedByLabel: actor.label,
          },
        });
        const number = await bookCoursePayment(tx, {
          actor,
          paymentId: payment.id,
          incomeCategoryId: settings?.incomeCategoryId ?? null,
          method: input.method,
          paidAt,
          amountCents: charge.amountCents,
          courseCode: charge.enrollment.course.code,
          debtorNumber: charge.enrollment.payerDebtorNumber,
          chargeLabel: chargeBookingLabel(charge),
        });
        await tx.coursePayment.update({ where: { id: payment.id }, data: { bookingNumber: number } });
        return {
          chargeId: charge.id,
          courseCode: charge.enrollment.course.code,
          debtorNumber: charge.enrollment.payerDebtorNumber,
          amountCents: charge.amountCents,
          bookingNumber: number,
        };
      });

      await audit({
        action: "PAYMENT",
        entity: "CourseCharge",
        entityId: result.chargeId,
        after: { course: result.courseCode, debtor: result.debtorNumber, amountCents: result.amountCents, bookingNumber: result.bookingNumber },
      });
      return { bookingNumber: result.bookingNumber };
    },
  });
  return run(input);
}

/** Tahsilatı geri alır: atomik ters kayıt kilidi + muhasebe fişi iptali tek transaction'da (#579). */
export async function reversePaymentAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const run = createAction({
    permission: { definition: courseFeesPermissions, action: "update" },
    schema: reversePaymentSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const actor = { id: user.id, label: buildUserLabel(user.name, user.email) };
      const reversed = await db.$transaction(async (tx) => {
        const payment = await tx.coursePayment.findUnique({ where: { id: input.paymentId } });
        if (!payment || payment.reversedAt) throw new ActionError("courses.errors.paymentNotFound");

        const claimed = await tx.coursePayment.updateMany({
          where: { id: payment.id, reversedAt: null },
          data: { reversedAt: new Date(), reverseReason: input.reason },
        });
        if (claimed.count !== 1) throw new ActionError("courses.errors.paymentNotFound");

        await reverseCoursePaymentBooking(tx, { actor, paymentId: payment.id, reason: input.reason });
        await tx.courseCharge.update({ where: { id: payment.chargeId }, data: { status: "OPEN" } });
        return { chargeId: payment.chargeId, bookingNumber: payment.bookingNumber };
      });
      await audit({ action: "PAYMENT_REVERSE", entity: "CourseCharge", entityId: reversed.chargeId, after: { bookingNumber: reversed.bookingNumber, reason: input.reason } });
      return { ok: true as const };
    },
  });
  return run(input);
}

/** Kalemden feragat (burs, sosyal indirim): atomik durum kilidi ile fişsiz kapanır (#579). */
export async function waiveChargeAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const run = createAction({
    permission: { definition: courseFeesPermissions, action: "update" },
    schema: waiveChargeSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const waived = await db.$transaction(async (tx) => {
        const charge = await tx.courseCharge.findUnique({ where: { id: input.chargeId } });
        if (!charge) throw new ActionError("courses.errors.chargeNotFound");
        const claimed = await tx.courseCharge.updateMany({
          where: { id: charge.id, status: "OPEN" },
          data: { status: "WAIVED", waivedReason: input.reason },
        });
        if (claimed.count !== 1) throw new ActionError("courses.errors.chargeNotOpen");
        return { id: charge.id, amountCents: charge.amountCents };
      });
      await audit({ action: "CHARGE_WAIVE", entity: "CourseCharge", entityId: waived.id, after: { amountCents: waived.amountCents, reason: input.reason } });
      return { ok: true as const };
    },
  });
  return run(input);
}

export async function saveCoursesSettingsAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const run = createAction({
    permission: { definition: courseFeesPermissions, action: "update" },
    schema: settingsSchema,
    handler: async ({ input, audit }) => {
      const data = {
        incomeCategoryId: input.incomeCategoryId || null,
        payoutCategoryId: input.payoutCategoryId || null,
        defaultSessionMinutes: input.defaultSessionMinutes,
        uebungsleiterLimitCents: input.uebungsleiterLimitCents,
        ehrenamtLimitCents: input.ehrenamtLimitCents,
      };
      await getDb().coursesSettings.upsert({ where: { id: "singleton" }, create: { id: "singleton", ...data }, update: data });
      await audit({ action: "SETTINGS_UPDATE", entity: "CoursesSettings", entityId: "singleton", after: data });
      return { ok: true as const };
    },
  });
  return run(input);
}
