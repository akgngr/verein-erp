"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";
import { getAllowedAiProviders, isAiProviderAllowed } from "@/modules/system/automation";

import { aiPermissions } from "../permissions";
import { deleteAllConversations } from "../services/history";
import { AI_OPERATIONS, sanitizeMatrix, setAiPermissions } from "../services/permissions";
import { supportedOperations } from "../services/tools";
import { AI_PROVIDER_IDS, isPrivateEndpoint, isProviderReady, saveProviderCredential } from "../services/providers";
import { CLOUD_TEXT_MODES, getCloudSettings, setCloudSettings } from "../services/cloud-settings";
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
      // Onay geri alınınca sohbet geçmişi de silinir.
      await deleteAllConversations(user.id);
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
      if (!(await isProviderReady(input.provider))) throw new ActionError("ai.errors.providerNotReady");
      // #583: Gizlilik ön ayarı bu sağlayıcıya izin vermiyorsa seçilemez (örn. "Yalnız yerel").
      if (!isAiProviderAllowed(await getAllowedAiProviders(), input.provider)) throw new ActionError("ai.errors.providerNotAllowed");
      const previous = await getActiveProvider();
      await setActiveProvider(input.provider);
      await audit({ action: "AI_PROVIDER_CHANGED", entity: "AiSettings", entityId: "singleton", before: { provider: previous }, after: { provider: input.provider } });
      revalidatePath("/", "layout");
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

const credentialSchema = z.object({
  provider: z.enum(AI_PROVIDER_IDS),
  /** Boş: mevcut anahtar korunur. */
  apiKey: z.string().trim().max(500),
  clearKey: z.boolean(),
  model: z.string().trim().max(120),
  baseUrl: z.string().trim().max(300),
});

/**
 * Yönetici sağlayıcı bağlantısını kaydeder. Anahtar şifrelenerek yazılır ve hiçbir yanıtta
 * geri dönmez; denetim kaydına yalnızca "anahtar değişti" bilgisi yazılır.
 */
export async function saveAiProviderCredentialAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "update" },
    schema: credentialSchema,
    handler: async ({ input, audit }) => {
      if (input.provider === "local") {
        if (!input.baseUrl) throw new ActionError("ai.errors.baseUrlRequired", { baseUrl: ["ai.errors.baseUrlRequired"] });
        if (!isPrivateEndpoint(input.baseUrl)) throw new ActionError("ai.errors.baseUrlNotPrivate", { baseUrl: ["ai.errors.baseUrlNotPrivate"] });
      }
      await saveProviderCredential(input.provider, {
        apiKey: input.apiKey || undefined,
        clearKey: input.clearKey,
        model: input.model || null,
        baseUrl: input.provider === "local" ? input.baseUrl : null,
      });
      await audit({
        action: "AI_PROVIDER_CREDENTIAL",
        entity: "AiProviderCredential",
        entityId: input.provider,
        after: { model: input.model || null, keyChanged: Boolean(input.apiKey) || input.clearKey, keyCleared: input.clearKey },
      });
      revalidatePath("/", "layout");
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

/** Yönetici, modül bazında okuma/oluşturma/güncelleme/silme izinlerini seçer (varsayılan: hiçbiri). */
export async function setAiPermissionsAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "update" },
    schema: z.object({ matrix: z.record(z.string().max(40), z.array(z.enum(AI_OPERATIONS)).max(AI_OPERATIONS.length)) }),
    handler: async ({ input, audit }) => {
      // Yalnızca asistanın gerçekten aracı olan modül/işlemler kaydedilir.
      const matrix = sanitizeMatrix(input.matrix, supportedOperations());
      await setAiPermissions(matrix);
      await audit({ action: "AI_PERMISSIONS_CHANGED", entity: "AiSettings", entityId: "singleton", after: { matrix } });
      revalidatePath("/", "layout");
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}

/**
 * Yönetici bulut veri politikasını seçer (docs/architecture/ai-cloud-pseudonym-relay.md).
 * Değişiklik sağlayıcı politika sürümünü değiştirir; kullanıcıların rızası yenilenir.
 * Takma adlı kişi verisi yalnız SCREENED ile açılabilir.
 */
export async function setAiCloudPolicyAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: aiPermissions, action: "update" },
    schema: z.object({ textMode: z.enum(CLOUD_TEXT_MODES), pseudonymousRecords: z.boolean() }),
    handler: async ({ input, audit }) => {
      if (input.pseudonymousRecords && input.textMode !== "SCREENED") throw new ActionError("ai.cloudPolicy.errors.recordsNeedScreened");
      const before = await getCloudSettings();
      await setCloudSettings(input);
      await audit({ action: "AI_CLOUD_POLICY_CHANGED", entity: "AiSettings", entityId: "singleton", before, after: input });
      revalidatePath("/", "layout");
      return undefined;
    },
  });
  return run(input) as Promise<ActionResult>;
}
