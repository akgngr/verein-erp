"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { exportsPermissions } from "../permissions";
import { deleteGeneratedFile } from "../services/files";

/** Kullanıcı yalnızca KENDİ dosyasını silebilir. */
export async function deleteGeneratedFileAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: exportsPermissions, action: "delete" },
    schema: z.object({ id: z.string().min(1).max(100) }),
    handler: async ({ input, user, audit }) => {
      if (!(await deleteGeneratedFile(user.id, input.id))) throw new ActionError("exports.errors.notFound");
      await audit({ action: "FILE_DELETE", entity: "GeneratedFile", entityId: input.id });
      revalidatePath("/dosyalar");
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
