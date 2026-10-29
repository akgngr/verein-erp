"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { membersPermissions } from "../permissions";
import { deleteMemberSchema } from "../schemas/member";

/**
 * Üye silme: yalnızca delete yetkisi (ADMIN); yumuşak silme. Silinen üye
 * hiçbir liste/arama/istatistik/dışa aktarımda görünmez, üyelik numarası
 * yeniden kullanılmaz; işlem notları (MemberNote) kayıtlı kalır (kaskad).
 */
export async function deleteMemberAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: membersPermissions, action: "delete" },
    schema: deleteMemberSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const member = await db.member.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!member) throw new ActionError("members.errors.memberNotFound");

      const deletedAt = new Date();
      await db.member.update({
        where: { id: member.id },
        data: {
          deletedAt,
          deletedById: user.id,
          deletedByLabel: buildUserLabel(user.name, user.email),
        },
      });

      await audit({
        action: "DELETE",
        entity: "Member",
        entityId: member.id,
        before: {
          membershipNumber: member.membershipNumber,
          firstName: member.firstName,
          lastName: member.lastName,
        },
        after: {
          membershipNumber: member.membershipNumber,
          deletedAt: deletedAt.toISOString(),
        },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
