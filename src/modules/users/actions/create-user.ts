"use server";

import { getDb } from "@/shared/db";
import { hashPassword } from "@/shared/security/password";
import type { ActionResult } from "@/shared/types/action";

import {
  computeDefaultGrantWindow,
  isTimeBoxedRole,
  validateGrantWindow,
} from "@/shared/security/external-grant";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";
import { usersPermissions } from "../permissions";
import { userCreateSchema } from "../schemas/user";
import { createExternalGrant } from "../services/external-grants";
import { isAssignableRole } from "../services/roles";

/** Yeni kullanıcı: ad, e-posta, rol, geçici parola; mustChangePassword = true (11.1). */
export async function createUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: usersPermissions, action: "create" },
    schema: userCreateSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const email = input.email.toLowerCase();

      // P2002 yerine anlamlı özel mesaj (10.2).
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        throw new ActionError("users.errors.emailTaken", {
          email: ["users.errors.emailTaken"],
        });
      }

      // Yetki yükseltme koruması: Yönetici rolünü yalnızca bir Yönetici verebilir/değiştirebilir.
      if (user.role !== "ADMIN" && (input.role === "ADMIN")) {
        throw new ActionError("users.errors.adminOnly", { role: ["users.errors.adminOnly"] });
      }

      if (!(await isAssignableRole(input.role))) {
        throw new ActionError("users.errors.roleUnavailable", { role: ["users.errors.roleUnavailable"] });
      }

      let grantWindow: { startsAt: Date; expiresAt: Date } | null = null;
      if (isTimeBoxedRole(input.role)) {
        if (input.grantStartsAt && input.grantExpiresAt) {
          const startsAt = new Date(input.grantStartsAt);
          const expiresAt = new Date(input.grantExpiresAt);
          const check = validateGrantWindow(startsAt, expiresAt);
          if (!check.ok) {
            throw new ActionError(
              check.reason === "exceedsMaxDuration"
                ? "users.errors.grantExceedsMaxDuration"
                : "users.errors.grantEndBeforeStart",
            );
          }
          grantWindow = { startsAt, expiresAt };
        } else {
          grantWindow = computeDefaultGrantWindow();
        }
      }

      const created = await db.user.create({
        data: {
          name: input.name,
          email,
          role: input.role,
          passwordHash: await hashPassword(input.password),
          mustChangePassword: true,
        },
      });

      await audit({
        action: "CREATE",
        entity: "User",
        entityId: created.id,
        after: { name: created.name, email: created.email, role: created.role, isActive: created.isActive },
      });

      if (grantWindow) {
        await createExternalGrant({
          userId: created.id,
          moduleScope: input.grantModuleScope ?? null,
          startsAt: grantWindow.startsAt,
          expiresAt: grantWindow.expiresAt,
          actorUserId: user.id,
          actorUserLabel: buildUserLabel(user.name, user.email),
        });
      }

      return { id: created.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}
