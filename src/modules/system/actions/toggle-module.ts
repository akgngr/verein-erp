"use server";

import { z } from "zod";
import { ActionError, createAction } from "@/modules/auth/server";
import { systemPermissions } from "@/shared/permissions/system";
import { allModules } from "@/registry";
import { isAccessApproved } from "@/shared/modules/module-access";
import { enabledDependents, planEnable } from "@/shared/modules/dependencies";

import { getAccessRecord } from "../services/module-access-store";
import { getEffectiveModuleStates, setModuleEnabled } from "../services/module-state-store";
import type { ActionResult } from "@/shared/types/action";

const toggleModuleSchema = z.object({
  key: z.string().min(1),
  isActive: z.boolean(),
  /** Kullanıcı planı gördü ve onayladı: zorunlular birlikte açılır / bağımlılar birlikte kapanır. */
  confirmed: z.boolean().optional().default(false),
  /** Birlikte açılacak önerilen modüller (planın recommended listesinden). */
  recommended: z.array(z.string()).max(20).optional().default([]),
});

async function enabledLookup() {
  const states = await getEffectiveModuleStates();
  return (key: string) => {
    const mod = allModules.find((item) => item.key === key);
    return Boolean(mod && (mod.category === "CORE" || mod.isProtected || states[key] !== false));
  };
}

export type ModuleTogglePlan = {
  enable: { key: string; needsApproval: boolean }[];
  missing: { module: string; version?: string; installed?: string }[];
  recommended: { key: string; needsApproval: boolean }[];
  disable: string[];
};

/** Aç/kapat öncesi plan: birlikte açılacak zorunlular, eksikler, önerilenler veya birlikte kapanacak bağımlılar. */
export async function getModuleTogglePlanAction(input: unknown): Promise<ActionResult<ModuleTogglePlan>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: z.object({ key: z.string().min(1), isActive: z.boolean() }),
    handler: async ({ input }) => {
      const isEnabled = await enabledLookup();
      const approval = async (key: string) => {
        const mod = allModules.find((item) => item.key === key);
        return { key, needsApproval: Boolean(mod && !isAccessApproved(mod, await getAccessRecord(key))) };
      };
      if (!input.isActive) return { enable: [], missing: [], recommended: [], disable: enabledDependents(input.key, allModules, isEnabled) };
      const plan = planEnable(input.key, allModules, isEnabled);
      return {
        enable: await Promise.all(plan.enable.map(approval)),
        missing: plan.missing,
        recommended: await Promise.all(plan.recommended.map(approval)),
        disable: [],
      };
    },
  });
  return run(input);
}

export async function toggleModuleAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: toggleModuleSchema,
    handler: async ({ input, audit }) => {
      const moduleMeta = allModules.find((m) => m.key === input.key);
      if (!moduleMeta) {
        throw new ActionError("system.errors.notFound");
      }

      if (moduleMeta.isProtected || moduleMeta.category === "CORE") {
        throw new ActionError("system.errors.coreCannotDisable");
      }
      const isEnabled = await enabledLookup();

      if (!input.isActive) {
        // Zorunlu bağımlılar: kullanıcı onayıyla birlikte kapanır (önce bağımlılar).
        const dependents = enabledDependents(input.key, allModules, isEnabled);
        if (dependents.length && !input.confirmed) throw new ActionError("system.dependencies.errors.dependentsActive");
        for (const key of [...dependents].reverse()) await setModuleEnabled(key, false);
        await setModuleEnabled(input.key, false);
        await audit({ action: "UPDATE", entity: "SystemModule", entityId: input.key, after: { key: input.key, isActive: false, cascade: dependents } });
        return { key: input.key, isActive: false };
      }

      const plan = planEnable(input.key, allModules, isEnabled);
      if (plan.missing.length) throw new ActionError("system.dependencies.errors.missing");
      if (plan.enable.length && !input.confirmed) throw new ActionError("system.dependencies.errors.required");
      const extras = input.recommended.filter((key) => plan.recommended.includes(key));
      const toEnable = [...plan.enable, input.key, ...extras];
      // Erişim izni olmadan etkinleştirme yok: ilgili modüller önce onay penceresinden izin almalı.
      for (const key of toEnable) {
        const mod = allModules.find((item) => item.key === key);
        if (!mod || !isAccessApproved(mod, await getAccessRecord(key))) throw new ActionError("system.errors.accessNotApproved");
      }
      for (const key of toEnable) await setModuleEnabled(key, true);

      await audit({
        action: "UPDATE",
        entity: "SystemModule",
        entityId: input.key,
        after: { key: input.key, isActive: true, withRequired: plan.enable, withRecommended: extras },
      });

      return { key: input.key, isActive: true };
    },
  });

  return run(input) as Promise<ActionResult>;
}
