"use server";

import { isAssignableRole } from "../services/roles";
import { z } from "zod";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";
import { usersPermissions } from "../permissions";
import { userUpdateSchema } from "../schemas/user";

const UPDATE_SCHEMA = userUpdateSchema.extend({ id: z.string().min(1) });

/**
 * Düzenleme: ad, e-posta, rol, aktif/pasif (11.1).
 * Kısıtlar: yönetici kendi rolünü düşüremez, kendini pasife alamaz,
 * sistemde en az bir aktif ADMIN kalmalıdır.
 */
export async function updateUserAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: usersPermissions, action: "update" },
    schema: UPDATE_SCHEMA,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const target = await db.user.findUnique({ where: { id: input.id } });
      if (!target) throw new ActionError("users.errors.notFound");

      const email = input.email.toLowerCase();
      if (email !== target.email) {
        const duplicate = await db.user.findUnique({ where: { email } });
        if (duplicate) {
          throw new ActionError("users.errors.emailTaken", {
            email: ["users.errors.emailTaken"],
          });
        }
      }

      // Yetki yükseltme koruması: Yönetici rolünü yalnızca bir Yönetici verebilir/değiştirebilir.
      if (user.role !== "ADMIN" && (input.role === "ADMIN" || target.role === "ADMIN")) {
        throw new ActionError("users.errors.adminOnly", { role: ["users.errors.adminOnly"] });
      }

      // Rol değişiyorsa yeni rol atanabilir olmalı (mevcut rol, modülü pasif olsa da korunabilir).
      if (input.role !== target.role && !(await isAssignableRole(input.role))) {
        throw new ActionError("users.errors.roleUnavailable", { role: ["users.errors.roleUnavailable"] });
      }

      if (target.id === user.id && target.role === "ADMIN" && input.role !== "ADMIN") {
        throw new ActionError("users.errors.selfDemote", {
          role: ["users.errors.selfDemote"],
        });
      }

      if (target.id === user.id && target.isActive && !input.isActive) {
        throw new ActionError("users.errors.selfDeactivate", {
          isActive: ["users.errors.selfDeactivate"],
        });
      }

      const losesAdmin =
        target.role === "ADMIN" && target.isActive && (input.role !== "ADMIN" || !input.isActive);
      if (losesAdmin) {
        const activeAdmins = await db.user.count({ where: { role: "ADMIN", isActive: true } });
        if (activeAdmins <= 1) {
          throw new ActionError("users.errors.lastAdmin");
        }
      }

      const updated = await db.user.update({
        where: { id: target.id },
        data: { name: input.name, email, role: input.role, isActive: input.isActive },
      });

      await audit({
        action: "UPDATE",
        entity: "User",
        entityId: updated.id,
        before: { name: target.name, email: target.email, role: target.role, isActive: target.isActive },
        after: { name: updated.name, email: updated.email, role: updated.role, isActive: updated.isActive },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
