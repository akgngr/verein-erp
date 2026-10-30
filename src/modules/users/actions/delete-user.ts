"use server";

import { z } from "zod";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";
import { usersPermissions } from "../permissions";

const DELETE_SCHEMA = z.object({ id: z.string().min(1) });

/**
 * Kalıcı silme. Kısıtlar: kendini silemez; son aktif ADMIN silinemez.
 * Diğer modüller kullanıcıya yumuşak referansla bağlıdır (FK yok); kayıtlarındaki ad etiketleri korunur.
 * Denetim kaydında kullanıcının adı ve e-postası saklanır.
 */
export async function deleteUserAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: usersPermissions, action: "delete" },
    schema: DELETE_SCHEMA,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const target = await db.user.findUnique({ where: { id: input.id } });
      if (!target) throw new ActionError("users.errors.notFound");
      if (target.id === user.id) throw new ActionError("users.errors.selfDelete");

      if (target.role === "ADMIN" && target.isActive) {
        const activeAdmins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
        if (activeAdmins <= 1) throw new ActionError("users.errors.lastAdmin");
      }

      await db.user.delete({ where: { id: target.id } });
      await audit({
        action: "DELETE",
        entity: "User",
        entityId: target.id,
        before: { name: target.name, email: target.email, role: target.role, isActive: target.isActive },
      });
      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
