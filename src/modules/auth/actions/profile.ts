"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/shared/types/action";

import { profileSchema } from "../schemas/profile";
import { createAction } from "../server";
import { saveProfile } from "../services/profile";

/** /profil: kullanıcı yalnızca KENDİ profilini kaydeder. Denetim kaydına değerler yazılmaz. */
export async function saveProfileAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    schema: profileSchema,
    handler: async ({ input, user, audit }) => {
      const changes = await saveProfile(user.id, input);
      await audit({ action: "PROFILE_UPDATE", entity: "UserProfile", entityId: user.id, after: changes });
      revalidatePath("/profil");
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
