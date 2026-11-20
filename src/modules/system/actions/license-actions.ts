"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { systemPermissions } from "@/shared/permissions/system";
import type { ActionResult } from "@/shared/types/action";

import { removeLicense, saveLicense } from "../services/license-store";

/** Yönetici lisansı girer. İmzası geçersiz lisans kaydedilmez; eşleşmeyen lisans kaydedilir ve nedeni ekranda görünür. */
export async function saveLicenseAction(input: unknown): Promise<ActionResult<{ state: string }>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: z.object({ text: z.string().min(1).max(16_000) }).strict(),
    handler: async ({ input, audit }) => {
      const status = await saveLicense(input.text);
      if (status.state === "invalid" || status.state === "none") throw new ActionError(`system.license.errors.${status.state === "invalid" ? status.reason : "format"}`);
      revalidatePath("/", "layout");
      // Denetim kaydına yalnız kimlik ve durum (kurum adı/alan adı lisans metninde kalır).
      await audit({ action: "LICENSE_SAVE", entity: "SystemLicense", entityId: status.payload.licenseId, after: { state: status.state, features: status.payload.features, expiresAt: status.payload.expiresAt } });
      return { state: status.state };
    },
  });
  return run(input);
}

export async function removeLicenseAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "delete" },
    schema: z.object({}).strict(),
    handler: async ({ audit }) => {
      await removeLicense();
      revalidatePath("/", "layout");
      await audit({ action: "LICENSE_REMOVE", entity: "SystemLicense", entityId: "license" });
      return null;
    },
  });
  return run(input);
}
