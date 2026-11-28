"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { grantsPermissions } from "../permissions";
import { grantSchema } from "../schemas/grant";
import { addPayout, deleteGrant, deletePayout, saveGrant, saveLines, saveReportText, setPayoutReceived } from "../services/grants";

const id = z.string().min(1).max(64);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "grants.errors.date");
const cents = z.number().int().min(0).max(10_000_000_000);
const text = (max: number) => z.string().trim().max(max).transform((value) => value || null);
const done = (grantId?: string) => {
  revalidatePath("/muhasebe/hibeler");
  if (grantId) revalidatePath(`/muhasebe/hibeler/${grantId}`);
};

export async function saveGrantAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  // #582: Yeni hibe "create", mevcut hibe "update" yetkisi ister.
  const isCreate = !(input && typeof input === "object" && "id" in input && (input as { id?: unknown }).id);
  return createAction({
    permission: { definition: grantsPermissions, action: isCreate ? "create" : "update" },
    schema: grantSchema,
    handler: async ({ input, user, audit }) => {
      const { id: grantId, ...data } = input;
      if (isCreate !== !grantId) throw new ActionError("grants.errors.notFound");
      const saved = await saveGrant(grantId, data, { id: user.id, label: buildUserLabel(user.name, user.email) });
      await audit({
        action: grantId ? "UPDATE" : "CREATE",
        entity: "Grant",
        entityId: saved.id,
        after: { status: data.status, approvedCents: data.approvedCents, periodStart: data.periodStart, periodEnd: data.periodEnd, projectId: data.projectId },
      });
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
    handler: async ({ input, audit }) => {
      await saveLines(input.grantId, input.lines);
      await audit({ action: "UPDATE", entity: "GrantBudget", entityId: input.grantId, after: { lines: input.lines.length, plannedCents: input.lines.reduce((sum, line) => sum + line.plannedCents, 0) } });
      done(input.grantId);
      return null;
    },
  })(input);
}

export async function addPayoutAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: grantsPermissions, action: "update" },
    schema: z.object({ grantId: id, requestedAt: date, amountCents: cents.min(1, "grants.errors.amount"), receivedAt: date.nullable(), note: text(500) }),
    handler: async ({ input, audit }) => {
      const { grantId, ...data } = input;
      const payout = await addPayout(grantId, data);
      await audit({ action: "CREATE", entity: "GrantPayout", entityId: payout.id, after: { grantId, amountCents: data.amountCents, requestedAt: data.requestedAt, receivedAt: data.receivedAt } });
      done(grantId);
      return null;
    },
  })(input);
}

export async function setPayoutReceivedAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: grantsPermissions, action: "update" },
    schema: z.object({ grantId: id, id, receivedAt: date.nullable() }),
    handler: async ({ input, audit }) => {
      const { before } = await setPayoutReceived(input.id, input.grantId, input.receivedAt);
      await audit({ action: "UPDATE", entity: "GrantPayout", entityId: input.id, before: { grantId: input.grantId, receivedAt: before }, after: { receivedAt: input.receivedAt } });
      done(input.grantId);
      return null;
    },
  })(input);
}

export async function deletePayoutAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    permission: { definition: grantsPermissions, action: "update" },
    schema: z.object({ grantId: id, id }),
    handler: async ({ input, audit }) => {
      await deletePayout(input.id, input.grantId);
      await audit({ action: "DELETE", entity: "GrantPayout", entityId: input.id, before: { grantId: input.grantId } });
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
