"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { courseFeesPermissions } from "../permissions";
import { paymentSchema, reversePaymentSchema, settingsSchema, waiveChargeSchema } from "../schemas/enrollment";
import { bookCoursePayment, chargeBookingLabel, reverseCoursePaymentBooking } from "../services/fee-bookings";
import { parseDateOnly } from "../utils";

/** Ücret kalemini tahsil eder: ödeme kaydı + muhasebe gelir fişi aynı transaction'da. */
export async function recordPaymentAction(input: unknown): Promise<ActionResult<{ bookingNumber: string }>> {
  const run = createAction({
    permission: { definition: courseFeesPermissions, action: "create" },
    schema: paymentSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const charge = await db.courseCharge.findUnique({
        where: { id: input.chargeId },
        include: { enrollment: { include: { course: { select: { code: true } } } } },
      });
      if (!charge) throw new ActionError("courses.errors.chargeNotFound");
      if (charge.status !== "OPEN") throw new ActionError("courses.errors.chargeNotOpen");
      const settings = await db.coursesSettings.findUnique({ where: { id: "singleton" } });
      const actor = { id: user.id, label: buildUserLabel(user.name, user.email) };
      const paidAt = parseDateOnly(input.paidAt)!;

      const bookingNumber = await db.$transaction(async (tx) => {
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
        await tx.courseCharge.update({ where: { id: charge.id }, data: { status: "PAID" } });
        return number;
      });

      await audit({
        action: "PAYMENT",
        entity: "CourseCharge",
        entityId: charge.id,
        after: { course: charge.enrollment.course.code, debtor: charge.enrollment.payerDebtorNumber, amountCents: charge.amountCents, bookingNumber },
      });
      return { bookingNumber };
    },
  });
  return run(input);
}

/** Tahsilatı geri alır: muhasebe fişi ters kayıtla iptal edilir, kalem yeniden açık olur. */
export async function reversePaymentAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const run = createAction({
    permission: { definition: courseFeesPermissions, action: "update" },
    schema: reversePaymentSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const payment = await db.coursePayment.findUnique({ where: { id: input.paymentId } });
      if (!payment || payment.reversedAt) throw new ActionError("courses.errors.paymentNotFound");
      const actor = { id: user.id, label: buildUserLabel(user.name, user.email) };
      await db.$transaction(async (tx) => {
        await reverseCoursePaymentBooking(tx, { actor, paymentId: payment.id, reason: input.reason });
        await tx.coursePayment.update({ where: { id: payment.id }, data: { reversedAt: new Date(), reverseReason: input.reason } });
        await tx.courseCharge.update({ where: { id: payment.chargeId }, data: { status: "OPEN" } });
      });
      await audit({ action: "PAYMENT_REVERSE", entity: "CourseCharge", entityId: payment.chargeId, after: { bookingNumber: payment.bookingNumber, reason: input.reason } });
      return { ok: true as const };
    },
  });
  return run(input);
}

/** Kalemden feragat (burs, sosyal indirim): fiş oluşmaz, gerekçe saklanır. */
export async function waiveChargeAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  const run = createAction({
    permission: { definition: courseFeesPermissions, action: "update" },
    schema: waiveChargeSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const charge = await db.courseCharge.findUnique({ where: { id: input.chargeId } });
      if (!charge) throw new ActionError("courses.errors.chargeNotFound");
      if (charge.status !== "OPEN") throw new ActionError("courses.errors.chargeNotOpen");
      await db.courseCharge.update({ where: { id: charge.id }, data: { status: "WAIVED", waivedReason: input.reason } });
      await audit({ action: "CHARGE_WAIVE", entity: "CourseCharge", entityId: charge.id, after: { amountCents: charge.amountCents, reason: input.reason } });
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
