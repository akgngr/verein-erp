"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/shared/types/action";

import { createAction } from "@/modules/auth/server";

import { aiPermissions } from "../permissions";
import { AI_CONSENT_VERSION, giveAiConsent, revokeAiConsent } from "../services/consent";

const empty = z.object({}).optional();

/** Kullanıcının asistan için açık rızası (bilgilendirme metnini okuyup onaylar). */
export async function acceptAiConsentAction(): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "view" },
    schema: empty,
    handler: async ({ user, audit }) => {
      await giveAiConsent(user.id);
      await audit({ action: "AI_CONSENT_GIVEN", entity: "AiUserConsent", entityId: user.id, after: { version: AI_CONSENT_VERSION } });
      revalidatePath("/", "layout");
      return undefined;
    },
  });
  return run({}) as Promise<ActionResult>;
}

/** Rızanın geri alınması: asistan bu kullanıcı için hemen kapanır. */
export async function revokeAiConsentAction(): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "view" },
    schema: empty,
    handler: async ({ user, audit }) => {
      await revokeAiConsent(user.id);
      await audit({ action: "AI_CONSENT_REVOKED", entity: "AiUserConsent", entityId: user.id });
      revalidatePath("/", "layout");
      return undefined;
    },
  });
  return run({}) as Promise<ActionResult>;
}
