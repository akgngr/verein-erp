"use server";

import { z } from "zod";

import { getDb } from "@/shared/db";
import { getEnv } from "@/shared/env";
import { verifyPassword } from "@/shared/security/password";

import { signIn } from "../auth";
import { ActionError } from "../errors";
import { createReissueTicket } from "../services/totp";
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
      try {
        // #603: the re-issue ticket stands in for the second factor this session already passed (server-only).
        await signIn("credentials", { email: dbUser.email, password: input.currentPassword, reissue: createReissueTicket(dbUser.id, getEnv().AUTH_SECRET), redirect: false });
      } catch {
        // All or nothing: if login throttling (lock/IP limit) blocks re-issuing this device's cookie, undo the
        // epoch bump so neither this device nor the others are signed out, and ask the user to try again later.
        await db.user.update({ where: { id: user.id }, data: { sessionEpoch: { decrement: 1 } } });
        throw new ActionError("auth.errors.rateLimited");
      }
      await audit({ action: "LOGOUT", entity: "User", entityId: user.id, after: { scope: "allOtherDevices" } });
      return undefined;
    },
  });
  return run(input);
}
