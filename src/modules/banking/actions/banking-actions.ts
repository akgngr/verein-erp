"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { revalidatePath } from "next/cache";

import { ActionError, createAction } from "@/modules/auth/server";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { bankingPermissions } from "../permissions";
import { idSchema, institutionsSchema, mapSchema, settingsSchema, startSchema } from "../schemas/banking";
import { mapAccount, markError, refreshConnection, removeConnection, startConnection, syncConnection } from "../services/connections";
import { BankProviderError, type Institution } from "../services/providers/types";
import { getProvider, isMockAllowed, saveBankingSettings } from "../services/settings";

const refresh = () => revalidatePath("/ayarlar/banka-baglantisi");

/** Sağlayıcı hatasını kullanıcı mesajına çevirir; ayrıntı (yanıt gövdesi, anahtar) gösterilmez. */
async function guarded<T>(run: () => Promise<T>, connectionId?: string): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof BankProviderError) {
      console.error("[banking]", err.message);
      if (connectionId) await markError(connectionId, err.code);
      throw new ActionError(`banking.errors.${err.code}`); // i18n-ignore (dinamik anahtar; errors.* tr/de’de var)
    }
    throw err;
  }
}

async function redirectBase(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") || host?.startsWith("127.") ? "http" : "https");
  if (!host) throw new ActionError("banking.errors.provider");
  return `${proto}://${host}`;
}

export async function saveBankingSettingsAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: bankingPermissions, action: "approve" },
    schema: settingsSchema,
    handler: async ({ input, audit }) => {
      if (input.provider === "MOCK" && !isMockAllowed()) throw new ActionError("banking.errors.mockDisabled");
      await saveBankingSettings({ provider: input.provider, secretId: input.secretId || undefined, secretKey: input.secretKey || undefined });
      // KVKK/güvenlik: anahtarlar denetim kaydına yazılmaz.
      await audit({ action: "UPDATE", entity: "BankingSettings", after: { provider: input.provider, credentialsChanged: Boolean(input.secretId || input.secretKey) } });
      refresh();
      return null;
    },
  });
  return run(input);
}

export async function listInstitutionsAction(input: unknown): Promise<ActionResult<Institution[]>> {
  const run = createAction({
    permission: { definition: bankingPermissions, action: "approve" },
    schema: institutionsSchema,
    handler: async ({ input }) => guarded(async () => (await getProvider()).listInstitutions(input.country)),
  });
  return run(input);
}

export async function startBankConnectionAction(input: unknown): Promise<ActionResult<{ link: string }>> {
  const run = createAction({
    permission: { definition: bankingPermissions, action: "approve" },
    schema: startSchema,
    handler: async ({ input, user, audit }) => {
      const result = await guarded(async () =>
        startConnection({
          institutionId: input.institutionId,
          institutionName: input.institutionName,
          redirectBase: await redirectBase(),
          language: await getLocale(),
          actor: { id: user.id, label: buildUserLabel(user.name, user.email) },
        }),
      );
      await audit({ action: "CREATE", entity: "BankConnection", entityId: result.id, after: { institutionId: input.institutionId } });
      return { link: result.link };
    },
  });
  return run(input);
}

export async function refreshBankConnectionAction(input: unknown): Promise<ActionResult<{ status: string }>> {
  const run = createAction({
    permission: { definition: bankingPermissions, action: "update" },
    schema: idSchema,
    handler: async ({ input }) => {
      const status = await guarded(() => refreshConnection(input.id), input.id);
      refresh();
      return { status };
    },
  });
  return run(input);
}

export async function syncBankConnectionAction(input: unknown): Promise<ActionResult<{ accounts: number; total: number; created: number }>> {
  const run = createAction({
    permission: { definition: bankingPermissions, action: "update" },
    schema: idSchema,
    handler: async ({ input, user, audit }) => {
      const result = await guarded(() => syncConnection(input.id, { id: user.id, label: buildUserLabel(user.name, user.email) }), input.id);
      await audit({ action: "IMPORT", entity: "BankConnection", entityId: input.id, after: result });
      refresh();
      revalidatePath("/muhasebe/banka");
      return result;
    },
  });
  return run(input);
}

export async function mapBankAccountAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: bankingPermissions, action: "approve" },
    schema: mapSchema,
    handler: async ({ input, audit }) => {
      await mapAccount(input.accountId, input.accountingAccountId);
      await audit({ action: "UPDATE", entity: "BankConnectionAccount", entityId: input.accountId, after: { accountingAccountId: input.accountingAccountId } });
      refresh();
      return null;
    },
  });
  return run(input);
}

export async function removeBankConnectionAction(input: unknown): Promise<ActionResult<null>> {
  const run = createAction({
    permission: { definition: bankingPermissions, action: "approve" },
    schema: idSchema,
    handler: async ({ input, audit }) => {
      await removeConnection(input.id);
      await audit({ action: "DELETE", entity: "BankConnection", entityId: input.id });
      refresh();
      return null;
    },
  });
  return run(input);
}
