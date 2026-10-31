"use server";

import { ActionError, createAction } from "@/modules/auth/server";
import { areFileDevToolsEnabled } from "@/shared/modules/dev-tools";
import { systemPermissions } from "@/shared/permissions/system";
import { syncModuleSchemas } from "@/shared/modules/sync-schemas";
import type { ActionResult } from "@/shared/types/action";
import { z } from "zod";

const emptySchema = z.object({}).optional();

export async function syncSchemasAction(): Promise<ActionResult<{ syncedCount: number }>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: emptySchema,
    handler: async () => {
      if (!areFileDevToolsEnabled()) throw new ActionError("system.errors.devToolsOnly");
      let result;
      try {
        result = syncModuleSchemas();
      } catch (error) {
        console.error("[system] Şema senkronu başarısız:", error);
        throw new ActionError("system.errors.syncFailed");
      }
      return { syncedCount: result.synced.length };
    },
  });

  return run({}) as Promise<ActionResult<{ syncedCount: number }>>;
}
