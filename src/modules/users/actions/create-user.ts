"use server";

import { getDb } from "@/shared/db";
import { hashPassword } from "@/shared/security/password";
import type { ActionResult } from "@/shared/types/action";

import { ActionError } from "@/modules/auth/server";
import { usersPermissions } from "../permissions";
import { userCreateSchema } from "../schemas/user";
import { isAssignableRole } from "../services/roles";
import { createAction } from "@/modules/auth/server";

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

      return { id: created.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}
