"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { documentsPermissions } from "../permissions";
import { addNoteSchema } from "../schemas/note";

/**
 * İşlem notu ekleme (5. bölüm md. 9): salt eklenir — düzenleme/silme yoktur,
 * notlar kronolojik akışta (en yeni üstte) gösterilir.
 */
export async function addNoteAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: documentsPermissions, action: "update" },
    schema: addNoteSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const doc = await db.document.findFirst({ where: { id: input.documentId, deletedAt: null } });
      if (!doc) throw new ActionError("documents.errors.documentNotFound");

      await db.documentNote.create({
        data: {
          documentId: doc.id,
          body: input.body,
          authorId: user.id,
          authorLabel: buildUserLabel(user.name, user.email),
        },
      });

      await audit({
        action: "NOTE_ADD",
        entity: "Document",
        entityId: doc.id,
        after: { registryNumber: doc.registryNumber, note: input.body },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
