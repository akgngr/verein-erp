"use server";

import { z } from "zod";
import { createAction } from "@/modules/auth/server";
import { systemPermissions } from "@/shared/permissions/system";
import type { ActionResult } from "@/shared/types/action";
import { getModuleReadinessReport, type ModuleReadinessReport } from "../services/readiness";

const emptySchema = z.object({}).optional();

export async function getModuleReadinessAction(): Promise<ActionResult<ModuleReadinessReport>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "view" },
    schema: emptySchema,
    handler: async () => {
      return getModuleReadinessReport();
    },
  });

  return run({}) as Promise<ActionResult<ModuleReadinessReport>>;
}
