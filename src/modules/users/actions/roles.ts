"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { PERMISSION_ACTIONS } from "@/shared/permissions/define";
import { CHIP_COLORS } from "@/shared/roles";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { usersPermissions } from "../permissions";
import { createCustomRole, deleteCustomRole, resetRoleGrants, setRoleGrant, updateCustomRole } from "../services/roles";

const roleKey = z.string().trim().min(1).max(40);
const roleFields = {
  label: z.string().trim().min(2, "users.roles.validation.labelMin").max(60, "users.roles.validation.labelMax"),
  description: z.string().trim().max(200, "users.roles.validation.descriptionMax").nullable(),
  color: z.enum(CHIP_COLORS as [string, ...string[]]),
};
const done = () => revalidatePath("/", "layout");

/** Bir rolün bir kaynaktaki izinleri (Roller ve İzinler ekranı). Yönetici rolü değiştirilemez. */
export async function setRoleGrantAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: usersPermissions, action: "update" },
    schema: z.object({ role: roleKey, resource: z.string().min(1).max(60), actions: z.array(z.enum(PERMISSION_ACTIONS as [string, ...string[]])).max(5) }),
    handler: async ({ input, audit }) => {
      const result = await setRoleGrant(input.role, input.resource, input.actions as never);
      if (result !== "ok") throw new ActionError(`users.roles.errors.${result}`); // i18n-ignore (çeviri anahtarı)
      await audit({ action: "ROLE_PERMISSIONS_CHANGED", entity: "Role", entityId: input.role, after: { resource: input.resource, actions: input.actions } });
      done();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

export async function resetRoleGrantsAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: usersPermissions, action: "update" },
    schema: z.object({ role: roleKey }),
    handler: async ({ input, audit }) => {
      if (input.role === "ADMIN") throw new ActionError("users.roles.errors.locked");
      await resetRoleGrants(input.role);
      await audit({ action: "ROLE_PERMISSIONS_RESET", entity: "Role", entityId: input.role });
      done();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

export async function createRoleAction(input: unknown): Promise<ActionResult<{ key: string }>> {
  const run = createAction({
    permission: { definition: usersPermissions, action: "create" },
    schema: z.object({ ...roleFields, copyFrom: roleKey.nullable() }),
    handler: async ({ input, audit }) => {
      const key = await createCustomRole({ label: input.label, description: input.description || null, color: input.color as never, copyFrom: input.copyFrom });
      await audit({ action: "ROLE_CREATED", entity: "Role", entityId: key, after: { label: input.label, copyFrom: input.copyFrom } });
      done();
      return { key };
    },
  });
  return run(input) as Promise<ActionResult<{ key: string }>>;
}

export async function updateRoleAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: usersPermissions, action: "update" },
    schema: z.object({ key: roleKey, ...roleFields }),
    handler: async ({ input, audit }) => {
      if (!(await updateCustomRole(input.key, { label: input.label, description: input.description || null, color: input.color as never }))) throw new ActionError("users.roles.errors.notCustom");
      await audit({ action: "ROLE_UPDATED", entity: "Role", entityId: input.key, after: { label: input.label } });
      done();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

export async function deleteRoleAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: usersPermissions, action: "delete" },
    schema: z.object({ key: roleKey }),
    handler: async ({ input, audit }) => {
      const result = await deleteCustomRole(input.key);
      if (result === "notFound") throw new ActionError("users.roles.errors.notCustom");
      if (result === "inUse") throw new ActionError("users.roles.errors.inUse");
      await audit({ action: "ROLE_DELETED", entity: "Role", entityId: input.key });
      done();
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
