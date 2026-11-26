"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, createAction, unlinkAuthIdentity } from "@/modules/auth/server";
import { getModuleAvailability } from "@/modules/system/server";
import { BASE_PATH, PROVIDERS } from "../constants";

const unlink = createAction({
  schema: z.object({ provider: z.enum(PROVIDERS) }).strict(),
  async handler({ input, user }) {
    if (await getModuleAvailability("social-login") !== "available") {
      throw new ActionError("social-login.errors.unavailable");
    }
    await unlinkAuthIdentity({ provider: input.provider, userId: user.id, actorId: user.id });
    revalidatePath(BASE_PATH);
    return null;
  },
});

export async function unlinkProviderAction(input: unknown) {
  return unlink(input);
}
