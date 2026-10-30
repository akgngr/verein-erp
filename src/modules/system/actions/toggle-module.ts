"use server";

import { z } from "zod";
import { ActionError, createAction } from "@/modules/auth/server";
import { systemPermissions } from "@/shared/permissions/system";
import { allModules } from "@/registry";
import { isAccessApproved } from "@/shared/modules/module-access";
import { setModuleActive } from "@/shared/modules/module-store";
import type { ActionResult } from "@/shared/types/action";

const toggleModuleSchema = z.object({
  key: z.string().min(1),
  isActive: z.boolean(),
});

export async function toggleModuleAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: toggleModuleSchema,
    handler: async ({ input, audit }) => {
      const moduleMeta = allModules.find((m) => m.key === input.key);
      if (!moduleMeta) {
        throw new ActionError("system.errors.notFound");
      }

      if (moduleMeta.isProtected || moduleMeta.category === "CORE") {
        throw new ActionError("system.errors.coreCannotDisable");
      }

      // Erişim izni olmadan etkinleştirme yok: önce onay penceresinden izin verilmelidir.
      if (input.isActive && !isAccessApproved(moduleMeta.key, moduleMeta.access)) {
        throw new ActionError("system.errors.accessNotApproved");
      }

      await setModuleActive(input.key, input.isActive);

      await audit({
        action: "UPDATE",
        entity: "SystemModule",
        entityId: input.key,
        after: { key: input.key, isActive: input.isActive },
      });

      return { key: input.key, isActive: input.isActive };
    },
  });

  return run(input) as Promise<ActionResult>;
}
