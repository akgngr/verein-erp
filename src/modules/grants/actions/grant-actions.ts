"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { grantsPermissions } from "../permissions";
import { addPayout, deleteGrant, deletePayout, saveGrant, saveLines, saveReportText, setPayoutReceived, STATUSES } from "../services/grants";

const id = z.string().min(1).max(64);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "grants.errors.date");
const cents = z.number().int().min(0).max(10_000_000_000);
const text = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const done = (grantId?: string) => {
  revalidatePath("/hibeler");
  if (grantId) revalidatePath(`/hibeler/${grantId}`);
};

const grantSchema = z.object({
  id: id.nullable(),
  name: z.string().trim().min(2, "grants.errors.name").max(200),
  funder: z.string().trim().min(2, "grants.errors.funder").max(200),
  fileNumber: text(100),
  purpose: text(4000),
  status: z.enum(STATUSES),
  approvedCents: cents.nullable(),
  ownShareCents: cents,
  thirdPartyCents: cents,
  periodStart: date,
  periodEnd: date,
  reportDueAt: date.nullable(),
  projectId: id.nullable(),
  useNetAmounts: z.boolean(),
}).refine((value) => value.periodStart <= value.periodEnd, { message: "grants.errors.period", path: ["periodEnd"] });

export async function saveGrantAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: grantsPermissions, action: "update" },
    schema: grantSchema,
    handler: async ({ input, user, audit }) => {
      const { id: grantId, ...data } = input;
      const saved = await saveGrant(grantId, data, { id: user.id, label: buildUserLabel(user.name, user.email) });
      await audit({ action: grantId ? "UPDATE" : "CREATE", entity: "Grant", entityId: saved.id });
      done(saved.id);
      return saved;
    },
  })(input);
}

export async function deleteGrantAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: grantsPermissions, action: "delete" },
    schema: z.object({ id }),
    handler: async ({ input, audit }) => {
      await deleteGrant(input.id);
      await audit({ action: "DELETE", entity: "Grant", entityId: input.id });
      done();
      return null;
    },
  })(input);
}

export async function saveLinesAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: grantsPermissions, action: "update" },
    schema: z.object({ grantId: id, lines: z.array(z.object({ label: z.string().trim().min(1, "grants.errors.lineLabel").max(200), plannedCents: cents, categoryIds: z.array(id).max(50) })).max(100) }),
    handler: async ({ input }) => {
      await saveLines(input.grantId, input.lines);
      done(input.grantId);
      return null;
    },
  })(input);
}

export async function addPayoutAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: grantsPermissions, action: "update" },
    schema: z.object({ grantId: id, requestedAt: date, amountCents: cents.min(1, "grants.errors.amount"), receivedAt: date.nullable(), note: text(500) }),
    handler: async ({ input }) => {
      const { grantId, ...data } = input;
      await addPayout(grantId, data);
      done(grantId);
      return null;
    },
  })(input);
}

export async function setPayoutReceivedAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: grantsPermissions, action: "update" },
    schema: z.object({ grantId: id, id, receivedAt: date.nullable() }),
    handler: async ({ input }) => {
      await setPayoutReceived(input.id, input.receivedAt);
      done(input.grantId);
      return null;
    },
  })(input);
}

export async function deletePayoutAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: grantsPermissions, action: "update" },
    schema: z.object({ grantId: id, id }),
    handler: async ({ input }) => {
      await deletePayout(input.id);
      done(input.grantId);
      return null;
    },
  })(input);
}

export async function saveReportAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: grantsPermissions, action: "update" },
    schema: z.object({ id, text: z.string().max(50_000), submitted: z.boolean().nullable() }),
    handler: async ({ input, audit }) => {
      if (input.submitted === true && !input.text.trim()) throw new ActionError("grants.errors.reportEmpty");
      await saveReportText(input.id, input.text, input.submitted);
      if (input.submitted !== null) await audit({ action: "UPDATE", entity: "Grant", entityId: input.id });
      done(input.id);
      return null;
    },
  })(input);
}
