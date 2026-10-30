"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { aiPermissions } from "../permissions";
import { AI_PROVIDER_IDS, isProviderReady } from "../services/providers";
import { AI_CONSENT_VERSION, getActiveProvider, giveAiConsent, revokeAiConsent, setActiveProvider } from "../services/consent";

const empty = z.object({}).optional();

/** Kullanıcının asistan için açık rızası (bilgilendirme metnini okuyup onaylar). */
export async function acceptAiConsentAction(): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "view" },
    schema: empty,
    handler: async ({ user, audit }) => {
      const provider = await getActiveProvider();
      if (!provider) throw new ActionError("ai.errors.notConfigured");
      await giveAiConsent(user.id, provider);
      await audit({ action: "AI_CONSENT_GIVEN", entity: "AiUserConsent", entityId: user.id, after: { version: AI_CONSENT_VERSION, provider } });
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

/**
 * Yönetici sağlayıcıyı seçer. Yalnızca izinli listedeki ve hazır (anahtar/model/yerel adres)
 * sağlayıcılar seçilebilir. Değişiklik, tüm kullanıcıların rızasını fiilen geçersiz kılar.
 */
export async function setAiProviderAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "update" },
    schema: z.object({ provider: z.enum(AI_PROVIDER_IDS) }),
    handler: async ({ input, audit }) => {
      if (!isProviderReady(input.provider)) throw new ActionError("ai.errors.providerNotReady");
      const previous = await getActiveProvider();
      await setActiveProvider(input.provider);
      await audit({ action: "AI_PROVIDER_CHANGED", entity: "AiSettings", entityId: "singleton", before: { provider: previous }, after: { provider: input.provider } });
      revalidatePath("/", "layout");
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
