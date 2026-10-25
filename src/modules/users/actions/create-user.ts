"use server";

import { getDb } from "@/shared/db";
import { hashPassword } from "@/shared/security/password";
import type { ActionResult } from "@/shared/types/action";

import { ActionError } from "@/modules/auth/server";
import { usersPermissions } from "../permissions";
import { userCreateSchema } from "../schemas/user";
import { createAction } from "@/modules/auth/server";

/** Yeni kullanıcı: ad, e-posta, rol, geçici parola; mustChangePassword = true (11.1). */
export async function createUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: usersPermissions, action: "create" },
    schema: userCreateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const email = input.email.toLowerCase();

      // P2002 yerine anlamlı özel mesaj (10.2).
      const existing = await db.user.findUnique({ where: { email } });
      if (existing) {
        throw new ActionError("Bu e-posta adresi zaten kullanımda.", {
          email: ["Bu e-posta adresi zaten kullanımda."],
        });
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
