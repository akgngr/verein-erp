"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { coursePayoutsPermissions } from "../permissions";
import { isValidPeriod } from "../services/payout-calc";
import { approvePayout, cancelPayout, generatePayouts, markPayoutPaid } from "../services/payouts";

const refresh = () => revalidatePath("/kurslar/hakedisler");
const periodSchema = z.object({ period: z.string().refine(isValidPeriod, "courses.payouts.errors.period") });
const idSchema = z.object({ id: z.string().min(1) });
const paySchema = z.object({ id: z.string().min(1), paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "courses.payouts.errors.date") });
const cancelSchema = z.object({ id: z.string().min(1), reason: z.string().trim().min(3, "courses.payouts.errors.reason").max(200) });

export async function generatePayoutsAction(input: unknown): Promise<ActionResult<{ created: number; updated: number; skipped: number }>> {
  const run = createAction({
    permission: { definition: coursePayoutsPermissions, action: "create" },
    schema: periodSchema,
    handler: async ({ input, user, audit }) => {
      const result = await generatePayouts(input.period, { id: user.id, label: buildUserLabel(user.name, user.email) });
      await audit({ action: "CREATE", entity: "CourseTeacherPayout", after: { period: input.period, ...result } });
      refresh();
      return result;
    },
  });
  return run(input);
}

export async function approvePayoutAction(input: unknown): Promise<ActionResult<{ number: string }>> {
  const run = createAction({
    permission: { definition: coursePayoutsPermissions, action: "approve" },
    schema: idSchema,
    handler: async ({ input, user, audit }) => {
      const number = await approvePayout(input.id, { id: user.id, label: buildUserLabel(user.name, user.email) });
      await audit({ action: "APPROVE", entity: "CourseTeacherPayout", entityId: input.id, after: { number } });
      refresh();
      return { number };
    },
  });
  return run(input);
}

export async function markPayoutPaidAction(input: unknown): Promise<ActionResult<{ bookingNumber: string }>> {
  const run = createAction({
    permission: { definition: coursePayoutsPermissions, action: "update" },
    schema: paySchema,
    handler: async ({ input, user, audit }) => {
      const paidAt = new Date(`${input.paidAt}T00:00:00Z`);
      if (paidAt.getTime() > Date.now() + 86_400_000) throw new ActionError("courses.payouts.errors.date");
      const bookingNumber = await markPayoutPaid(input.id, paidAt, { id: user.id, label: buildUserLabel(user.name, user.email) });
      await audit({ action: "UPDATE", entity: "CourseTeacherPayout", entityId: input.id, after: { status: "PAID", bookingNumber } });
      refresh();
      return { bookingNumber };
    },
  });
  return run(input);
}

export async function cancelPayoutAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: coursePayoutsPermissions, action: "delete" },
    schema: cancelSchema,
    handler: async ({ input, user, audit }) => {
      await cancelPayout(input.id, input.reason, { id: user.id, label: buildUserLabel(user.name, user.email) });
      await audit({ action: "CANCEL", entity: "CourseTeacherPayout", entityId: input.id, after: { reason: input.reason } });
      refresh();
      return null;
    },
  });
  return run(input);
}
