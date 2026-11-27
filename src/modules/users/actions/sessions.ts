"use server";

import { z } from "zod";

import { ActionError, createAction, resetUserTwoFactor } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { usersPermissions } from "../permissions";

/**
 * #603 — admin: end every session of a user (e.g. lost device). Increments `User.sessionEpoch`, which changes the
 * JWT session version; the user must sign in again. Only an ADMIN may do this for another ADMIN.
 */
export async function revokeUserSessionsAction(input: unknown): Promise<ActionResult> {
  return createAction({
    permission: { definition: usersPermissions, action: "update" },
    schema: z.object({ id: z.string().min(1).max(64) }).strict(),
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const target = await db.user.findUnique({ where: { id: input.id }, select: { id: true, role: true } });
      if (!target) throw new ActionError("users.errors.notFound");
      if (user.role !== "ADMIN" && target.role === "ADMIN") throw new ActionError("users.errors.adminOnly");
      await db.user.update({ where: { id: target.id }, data: { sessionEpoch: { increment: 1 } } });
      await audit({ action: "LOGOUT", entity: "User", entityId: target.id, after: { scope: "allDevices", byAdmin: true } });
      return undefined;
    },
  })(input) as Promise<ActionResult>;
}

/**
 * #603 — admin: reset a user's second factor (lost phone and recovery codes). The user signs in with the password
 * alone and may enrol again; all sessions end as well. Only an ADMIN may do this for another ADMIN.
 */
export async function resetUserTwoFactorAction(input: unknown): Promise<ActionResult> {
  return createAction({
    permission: { definition: usersPermissions, action: "update" },
    schema: z.object({ id: z.string().min(1).max(64) }).strict(),
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const target = await db.user.findUnique({ where: { id: input.id }, select: { id: true, role: true } });
      if (!target) throw new ActionError("users.errors.notFound");
      if (user.role !== "ADMIN" && target.role === "ADMIN") throw new ActionError("users.errors.adminOnly");
      if (!(await resetUserTwoFactor(target.id))) throw new ActionError("users.errors.twoFactorNotEnabled");
      await db.user.update({ where: { id: target.id }, data: { sessionEpoch: { increment: 1 } } });
      await audit({ action: "UPDATE", entity: "User", entityId: target.id, after: { twoFactor: "reset", byAdmin: true } });
      return undefined;
    },
  })(input) as Promise<ActionResult>;
}
