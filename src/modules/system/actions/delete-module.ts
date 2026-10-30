"use server";

import { z } from "zod";
import { ActionError, createAction } from "@/modules/auth/server";
import { systemPermissions } from "@/shared/permissions/system";
import { allModules } from "@/registry";
import { areFileDevToolsEnabled } from "@/shared/modules/dev-tools";
import { deleteModuleExtension } from "@/shared/modules/module-store";
import type { ActionResult } from "@/shared/types/action";

const deleteModuleSchema = z.object({
  key: z.string().min(1),
});

export async function deleteModuleAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "delete" },
    schema: deleteModuleSchema,
    handler: async ({ input, audit }) => {
      const moduleMeta = allModules.find((m) => m.key === input.key);
      if (!moduleMeta) {
        throw new ActionError("system.errors.notFound");
      }

      if (!areFileDevToolsEnabled()) throw new ActionError("system.errors.devToolsOnly");

      if (moduleMeta.category !== "EXTENSION") {
        throw new ActionError("system.errors.onlyExtensionsDeletable");
      }

      const res = await deleteModuleExtension(input.key);
      if (!res.success) {
        throw new ActionError(res.error ?? "system.errors.deleteFailed");
      }

      await audit({
        action: "DELETE",
        entity: "SystemModule",
        entityId: input.key,
        after: { key: input.key, deleted: true },
      });

      return { key: input.key };
    },
  });

  return run(input) as Promise<ActionResult>;
}
