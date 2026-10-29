"use server";

import { getDb } from "@/shared/db";
import { hashPassword } from "@/shared/security/password";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";
import { usersPermissions } from "../permissions";
import { userResetPasswordSchema } from "../schemas/user";

/** Parola sıfırlama: yeni geçici parola, mustChangePassword = true (11.1). */
export async function resetUserPasswordAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: usersPermissions, action: "update" },
    schema: userResetPasswordSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const target = await db.user.findUnique({ where: { id: input.id } });
      if (!target) throw new ActionError("users.errors.notFound");

      await db.user.update({
        where: { id: target.id },
        data: {
          passwordHash: await hashPassword(input.password),
          mustChangePassword: true,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });

      await audit({ action: "PASSWORD_RESET", entity: "User", entityId: target.id });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
