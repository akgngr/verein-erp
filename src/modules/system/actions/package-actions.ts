"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAction } from "@/modules/auth/server";
import { systemPermissions } from "@/shared/permissions/system";
import type { ActionResult } from "@/shared/types/action";

import { deleteModulePackage } from "../services/packages";

export async function deleteModulePackageAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "delete" },
    schema: z.object({ id: z.string().min(1) }),
    handler: async ({ input, audit }) => {
      await deleteModulePackage(input.id);
      await audit({ action: "DELETE", entity: "SystemModulePackage", entityId: input.id });
      revalidatePath("/ayarlar/moduller/paketler");
      return null;
    },
  });
  return run(input);
}
