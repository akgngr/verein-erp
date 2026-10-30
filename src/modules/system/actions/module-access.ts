"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { allModules } from "@/registry";
import { accessSignature, setAccessApproval } from "@/shared/modules/module-access";
import { setModuleActive } from "@/shared/modules/module-store";
import { systemPermissions } from "@/shared/permissions/system";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

const schema = z.object({ key: z.string().min(1), activate: z.boolean().optional() });

function findModule(key: string) {
  const mod = allModules.find((candidate) => candidate.key === key);
  if (!mod) throw new ActionError("system.errors.notFound");
  if (!mod.access?.length) throw new ActionError("system.errors.noAccessRequested");
  return mod;
}

/**
 * Yönetici, modülün bildirdiği erişimlere izin verir (isteğe bağlı olarak modülü de etkinleştirir).
 * Onay o anki erişim listesinin imzasına bağlanır; liste değişirse yeniden onay gerekir.
 */
export async function approveModuleAccessAction(input: unknown): Promise<ActionResult<{ key: string }>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema,
    handler: async ({ input, user, audit }) => {
      const mod = findModule(input.key);
      const signature = accessSignature(mod.access);
      setAccessApproval(mod.key, { signature, approvedAt: new Date().toISOString(), approvedBy: buildUserLabel(user.name, user.email) });
      if (input.activate) await setModuleActive(mod.key, true);
      revalidatePath("/", "layout");
      await audit({ action: "MODULE_ACCESS_APPROVE", entity: "SystemModule", entityId: mod.key, after: { access: signature, activated: Boolean(input.activate) } });
      return { key: mod.key };
    },
  });
  return run(input);
}

/** İzni geri alır: modül, yeniden onaylanana kadar kullanılamaz (menü, sayfa ve API kapalı). */
export async function revokeModuleAccessAction(input: unknown): Promise<ActionResult<{ key: string }>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema,
    handler: async ({ input, audit }) => {
      const mod = findModule(input.key);
      if (mod.category === "CORE") throw new ActionError("system.errors.coreCannotDisable");
      setAccessApproval(mod.key, null);
      revalidatePath("/", "layout");
      await audit({ action: "MODULE_ACCESS_REVOKE", entity: "SystemModule", entityId: mod.key, before: { access: accessSignature(mod.access) } });
      return { key: mod.key };
    },
  });
  return run(input);
}
