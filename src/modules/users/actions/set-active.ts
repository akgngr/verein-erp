"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";
import { usersPermissions } from "../permissions";
import { userSetActiveSchema } from "../schemas/user";

/**
 * Pasife alma / aktifleştirme (silme yok — 5. bölüm).
 * Kısıtlar: kendini pasife alınamaz; en az bir aktif ADMIN kalmalıdır.
 */
export async function setUserActiveAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: usersPermissions, action: "update" },
    schema: userSetActiveSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const target = await db.user.findUnique({ where: { id: input.id } });
      if (!target) throw new ActionError("Kullanıcı bulunamadı.");

      if (target.id === user.id) {
        throw new ActionError("Kendinizi pasife alamazsınız.");
      }

      if (target.isActive && !input.isActive && target.role === "ADMIN") {
        const activeAdmins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
        if (activeAdmins <= 1) {
          throw new ActionError("Sistemde en az bir aktif yönetici kalmalıdır.");
        }
      }

      const updated = await db.user.update({
        where: { id: target.id },
        data: { isActive: input.isActive },
      });

      await audit({
        action: input.isActive ? "ACTIVATE" : "DEACTIVATE",
        entity: "User",
        entityId: target.id,
        before: { isActive: target.isActive },
        after: { isActive: updated.isActive },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
