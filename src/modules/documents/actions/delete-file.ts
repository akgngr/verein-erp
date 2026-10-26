"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { documentsPermissions } from "../permissions";
import { deleteFileSchema } from "../schemas/document";

/**
 * Dosya silme (5. bölüm md. 5): update yetkisi gerekir; yumuşak silme
 * (DocumentFile.deletedAt), diskteki dosyaya DOKUNULMAZ.
 */
export async function deleteFileAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: documentsPermissions, action: "update" },
    schema: deleteFileSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const file = await db.documentFile.findFirst({
        where: { id: input.fileId, deletedAt: null },
        select: {
          id: true,
          originalName: true,
          document: { select: { id: true, registryNumber: true, deletedAt: true } },
        },
      });
      if (!file || file.document.deletedAt) throw new ActionError("Dosya bulunamadı.");

      await db.documentFile.update({
        where: { id: file.id },
        data: { deletedAt: new Date() },
      });

      // KARAR: DocumentFile şemasında silen kullanıcı alanı yoktur (Faz 1'de sabit); bilgi audit kaydında taşınır.

      await audit({
        action: "FILE_DELETE",
        entity: "DocumentFile",
        entityId: file.id,
        after: { registryNumber: file.document.registryNumber, fileName: file.originalName },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
