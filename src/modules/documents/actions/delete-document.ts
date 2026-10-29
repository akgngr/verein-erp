"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { documentsPermissions } from "../permissions";
import { deleteDocumentSchema } from "../schemas/document";

/**
 * Evrak silme: yalnızca delete yetkisi (ADMIN); yumuşak silme (5. bölüm md. 4).
 * Silinen evrak hiçbir liste/arama/istatistik/dışa aktarımda görünmez,
 * kayıt numarası yeniden kullanılmaz; dosya satırları ve disk dosyaları korunur.
 */
export async function deleteDocumentAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: documentsPermissions, action: "delete" },
    schema: deleteDocumentSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const doc = await db.document.findFirst({ where: { id: input.id, deletedAt: null } });
      if (!doc) throw new ActionError("documents.errors.documentNotFound");

      const deletedAt = new Date();
      await db.document.update({
        where: { id: doc.id },
        data: {
          deletedAt,
          deletedById: user.id,
          deletedByLabel: buildUserLabel(user.name, user.email),
        },
      });

      await audit({
        action: "DELETE",
        entity: "Document",
        entityId: doc.id,
        before: { registryNumber: doc.registryNumber, subject: doc.subject },
        after: { registryNumber: doc.registryNumber, deletedAt: deletedAt.toISOString() },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
