"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { documentsPermissions } from "../permissions";
import { changeStatusSchema } from "../schemas/document";

/**
 * Durum değişimi (5. bölüm md. 2): serbest geçiş; ayrı action ve ayrı audit
 * kaydıdır (STATUS_CHANGE, before.status/after.status).
 */
export async function changeStatusAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: documentsPermissions, action: "update" },
    schema: changeStatusSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const doc = await db.document.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!doc) throw new ActionError("Evrak bulunamadı.");

      const updated = await db.document.update({
        where: { id: doc.id },
        data: {
          status: input.status,
          updatedById: user.id,
          updatedByLabel: buildUserLabel(user.name, user.email),
        },
      });

      await audit({
        action: "STATUS_CHANGE",
        entity: "Document",
        entityId: doc.id,
        before: { registryNumber: doc.registryNumber, status: doc.status },
        after: { registryNumber: doc.registryNumber, status: updated.status },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
