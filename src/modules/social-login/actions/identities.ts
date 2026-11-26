"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, createAction, unlinkAuthIdentity, prepareAuthIdentityLink, signIn } from "@/modules/auth/server";
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

const prepare = createAction({
  schema: z.object({ provider: z.enum(PROVIDERS), password: z.string().min(1).max(200) }).strict(),
  async handler({ input }) {
    if (await getModuleAvailability("social-login") !== "available") throw new ActionError("social-login.errors.unavailable");
    await prepareAuthIdentityLink({ provider: input.provider, password: input.password, returnPath: BASE_PATH });
    return input.provider;
  },
});

export async function linkProviderAction(input: unknown) {
  const result = await prepare(input);
  if (!result.ok) return result;
  await signIn(result.data, { redirectTo: BASE_PATH });
  return { ok: true as const, data: null };
}
