"use server";

import { revalidatePath } from "next/cache";

import { createAction } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { secretaryPermissions } from "../permissions";
import { preferencesSchema, type Preferences } from "../schemas/preferences";
import { prismaPreferenceStore, savePreferences } from "../services/preferences";

/** Oturumdaki kullanıcının kendi sekreter tercihlerini kaydeder (başka hesap için değiştirilemez). */
export async function saveSecretaryPreferencesAction(input: unknown): Promise<ActionResult<Preferences>> {
  return createAction({
    permission: { definition: secretaryPermissions, action: "view" },
    schema: preferencesSchema,
    handler: async ({ input, user, audit }) => {
      const meta = await savePreferences(prismaPreferenceStore(getDb()), user.id, input);
      await audit({ action: "UPDATE", entity: "SecretaryPreference", after: meta });
      revalidatePath("/sekreter");
      return input;
    },
  })(input);
}
