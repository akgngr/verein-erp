"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ActionError, createAction } from "@/modules/auth/server";
import { getModuleAvailability } from "@/modules/system/server";
import { getDb } from "@/shared/db";
import { sealSecret, openSecret } from "@/shared/security/secret-box";
import { BASE_PATH, PROVIDERS } from "../constants";
import { socialLoginPermissions } from "../permissions";

const save = createAction({
  permission: { definition: socialLoginPermissions, action: "update" },
  schema: z.object({
    provider: z.enum(PROVIDERS),
    enabled: z.boolean(),
    clientId: z.string().trim().max(512),
    secret: z.string().max(4096),
    tenantId: z.string().trim().max(36),
  }).strict(),
  async handler({ input, audit }) {
    if (await getModuleAvailability("social-login") !== "available") throw new ActionError("social-login.errors.unavailable");
    const db = getDb();
    const tenantId = input.provider === "microsoft-entra-id" ? input.tenantId.toLowerCase() : null;
    if (input.enabled && (!input.clientId || (input.provider === "microsoft-entra-id" && !z.uuid().safeParse(tenantId).success))) throw new ActionError("social-login.errors.invalid");
    await db.$transaction(async (tx) => {
      const old = await tx.socialLoginProvider.findUnique({ where: { id: input.provider } });
      const secretEnc = input.secret ? sealSecret(`social-login:${input.provider}`, input.secret) : old?.secretEnc ?? "";
      if (input.enabled && (!secretEnc || !openSecret(`social-login:${input.provider}`, secretEnc))) throw new ActionError("social-login.errors.invalid");
      // Existing linked subjects are scoped to this OAuth application. Refuse changes until a dedicated identity reset is implemented.
      if (old?.clientId && (old.clientId !== input.clientId || old.tenantId !== tenantId)) {
        throw new ActionError("social-login.errors.applicationImmutable");
      }
      const data = { enabled: input.enabled, clientId: input.clientId, secretEnc, tenantId };
      // Do not persist a blank, disabled draft: it must not freeze an unconfigured application ID.
      if (!old && !input.clientId && !input.enabled) return;
      await tx.socialLoginProvider.upsert({ where: { id: input.provider }, create: { id: input.provider, ...data }, update: data });
    }, { isolationLevel: "Serializable" });
    await audit({ action: "UPDATE", entity: "SocialLoginProvider", entityId: input.provider, after: { enabled: input.enabled } });
    revalidatePath(BASE_PATH);
    return null;
  },
});

export async function saveProviderAction(input: unknown) { return save(input); }
