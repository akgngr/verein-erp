"use server";

import { createAction } from "@/modules/auth/server";
import { systemPermissions } from "@/shared/permissions/system";
import { syncModuleSchemas } from "../../../../scripts/sync-schemas";
import type { ActionResult } from "@/shared/types/action";
import { z } from "zod";

const emptySchema = z.object({}).optional();

export async function syncSchemasAction(): Promise<ActionResult<{ syncedCount: number }>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: emptySchema,
    handler: async () => {
      const result = syncModuleSchemas();
      return { syncedCount: result.synced.length };
    },
  });

  return run({}) as Promise<ActionResult<{ syncedCount: number }>>;
}
