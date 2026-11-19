"use server";

import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import type { Briefing } from "@/shared/secretary/define";
import type { ActionResult } from "@/shared/types/action";

import { secretaryPermissions } from "../permissions";
import { createDelegation, delegationInputSchema, DelegationError, type DelegationView, getDelegatedBriefing, listDelegations, revokeDelegation } from "../services/delegation";

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DelegationError) throw new ActionError(error.message);
    throw error;
  }
}

/** S5.2 (#316): vekil yetkisi ver (kapsam + süre sonu). */
export async function createDelegationAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: delegationInputSchema,
    handler: async ({ input, user, audit }) => {
      const created = await guard(() => createDelegation(user, input));
      await audit({ action: "CREATE", entity: "SecretaryDelegation", entityId: created.id, after: { delegateId: input.delegateId, scopes: created.scopes, expiresAt: created.expiresAt.toISOString() } });
      return { id: created.id };
    },
  })(input);
}

/** Geri alma her zaman serbest (sahibi veya vekil). */
export async function revokeDelegationAction(input: unknown): Promise<ActionResult<null>> {
  return createAction({
    schema: z.object({ id: z.string().min(1).max(64) }).strict(),
    handler: async ({ input, user, audit }) => {
      await guard(() => revokeDelegation(user.id, input.id));
      await audit({ action: "UPDATE", entity: "SecretaryDelegation", entityId: input.id, after: { revoked: true } });
      return null;
    },
  })(input);
}

export async function listMyDelegationsAction(input: unknown): Promise<ActionResult<DelegationView[]>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: z.object({}).strict(),
    handler: async ({ user }) => listDelegations(user.id),
  })(input ?? {});
}

/** Vekil görünümü (salt okunur; öneri yok). Her görüntüleme denetime yazılır. */
export async function getDelegatedBriefingAction(input: unknown): Promise<ActionResult<{ grantorId: string; briefing: Briefing }>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: z.object({ delegationId: z.string().min(1).max(64) }).strict(),
    handler: async ({ input, user, audit }) => {
      const { getBriefing } = await import("../services/briefing");
      const result = await guard(() => getDelegatedBriefing(user, input.delegationId, { buildBriefing: (owner, now) => getBriefing(owner, now, { proposals: false }) }));
      await audit({ action: "VIEW", entity: "SecretaryDelegation", entityId: input.delegationId, after: { grantorId: result.grantorId } });
      return result;
    },
  })(input);
}
