"use server";

import { z } from "zod";

import { getDb } from "@/shared/db";
import { verifyPassword } from "@/shared/security/password";

import { signIn } from "../auth";
import { ActionError } from "../errors";
import { createAction } from "../server";

const schema = z.object({ currentPassword: z.string().min(1, "auth.errors.currentPasswordWrong").max(200) }).strict();

/**
 * #603 — /profil: "Sign out all other devices". Requires the current password (re-authentication for a sensitive
 * action), increments `User.sessionEpoch` — which changes the JWT session version, so every other session ends —
 * and re-issues this device's cookie with the new version (same mechanism as the password change).
 */
export async function signOutOtherDevicesAction(input: unknown) {
  const run = createAction({
    allowPasswordChangePending: true,
    schema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const dbUser = await db.user.findUnique({ where: { id: user.id } });
      if (!dbUser || !dbUser.isActive) throw new ActionError("auth.errors.sessionInvalid");
      if (!(await verifyPassword(input.currentPassword, dbUser.passwordHash))) {
        throw new ActionError("auth.errors.currentPasswordWrong", { currentPassword: ["auth.errors.currentPasswordWrong"] });
      }
      await db.user.update({ where: { id: user.id }, data: { sessionEpoch: { increment: 1 } } });
      await audit({ action: "LOGOUT", entity: "User", entityId: user.id, after: { scope: "allOtherDevices" } });
      await signIn("credentials", { email: dbUser.email, password: input.currentPassword, redirect: false });
      return undefined;
    },
  });
  return run(input);
}
