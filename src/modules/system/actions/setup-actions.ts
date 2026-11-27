"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { applyAccountingPreset } from "@/modules/accounting/server";
import { allModules } from "@/registry";
import { withRequirements } from "@/shared/modules/dependencies";
import { getDb } from "@/shared/db";
import { isAccessApproved } from "@/shared/modules/module-access";
import { systemPermissions } from "@/shared/permissions/system";
import type { ActionResult } from "@/shared/types/action";

import { getAccessRecord } from "../services/module-access-store";
import { getEffectiveModuleStates, setModuleEnabled } from "../services/module-state-store";
import { fillDefaultAccountingMappings } from "../services/setup-accounting-mappings";
import { ORGANIZATION_TYPES, PRESET_MANAGED_MODULES, SETUP_KEYS } from "../services/setup";

const setupSchema = z.object({
  type: z.enum(ORGANIZATION_TYPES as [string, ...string[]]),
  modules: z.array(z.string()).max(50),
  smallBusiness: z.boolean(),
  chart: z.enum(["SKR03", "SKR04"]),
  accountingPreset: z.boolean(),
  /** #583: Açık olup seçilmeyen modüllerden kullanıcının özet adımında kapatmayı onayladıkları. */
  confirmDisable: z.array(z.string()).max(50).default([]),
});

/**
 * Kurulum sihirbazını uygular: modülleri açar/kapatır (erişim onayı olmayanlar atlanır ve
 * bildirilir), isteğe bağlı olarak muhasebe hazır ayarlarını yazar, kurum türünü kaydeder.
 * Var olan kategori/hesaplara dokunulmaz; sihirbaz tekrar çalıştırılabilir.
 *
 * #583:
 * - Zorunlu bağımlılıklar ön ayar listesinde olmasa da açılır (örn. toplu e-posta → otomasyon).
 * - Açık bir modül yalnız `confirmDisable` içindeyse kapatılır; onaylanmayanlar açık kalır (`kept`).
 * - Muhasebe hazır ayarından sonra boş varsayılan hesap/kategori eşlemeleri doldurulur (`mapped`).
 */
export async function applySetupAction(input: unknown): Promise<ActionResult<{ enabled: string[]; disabled: string[]; kept: string[]; needsApproval: string[]; categories: number; accounts: number; mapped: string[]; mappingError: string | null }>> {
  const run = createAction({
    permission: { definition: systemPermissions, action: "update" },
    schema: setupSchema,
    handler: async ({ input, audit }) => {
      // Zorunlu bağımlılıklar otomatik eklenir (örn. Kurslar → Öğrenciler).
      const wanted = new Set(withRequirements(input.modules, allModules));
      const confirmDisable = new Set(input.confirmDisable);
      const states = await getEffectiveModuleStates();
      const enabled: string[] = [];
      const disabled: string[] = [];
      const kept: string[] = [];
      const needsApproval: string[] = [];
      for (const key of new Set([...PRESET_MANAGED_MODULES, ...wanted])) {
        const meta = allModules.find((module) => module.key === key);
        if (!meta || meta.isProtected || meta.category === "CORE") continue;
        if (wanted.has(key)) {
          if (!isAccessApproved(meta, await getAccessRecord(key))) {
            needsApproval.push(key);
            continue;
          }
          await setModuleEnabled(key, true);
          enabled.push(key);
        } else if (states[key] === true && !confirmDisable.has(key)) {
          kept.push(key);
        } else if (states[key] !== false) {
          await setModuleEnabled(key, false);
          disabled.push(key);
        }
      }
      let categories = 0;
      let accounts = 0;
      let mapped: string[] = [];
      let mappingError: string | null = null;
      const db = getDb();
      if (input.accountingPreset) {
        if (!wanted.has("accounting")) throw new ActionError("system.setup.errors.accountingOff");
        const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
        const openingDate = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
        const result = await db.$transaction((tx) => applyAccountingPreset(tx, { type: input.type as never, smallBusiness: input.smallBusiness, chart: input.chart, openingDate }));
        categories = result.categories;
        accounts = result.accounts;
        const mappings = await fillDefaultAccountingMappings();
        mapped = mappings.filled;
        mappingError = mappings.error;
      }
      for (const [key, value] of [[SETUP_KEYS.type, input.type], [SETUP_KEYS.completedAt, new Date().toISOString()]] as const) {
        await db.systemSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
      }
      await audit({ action: "UPDATE", entity: "SystemSetup", entityId: "setup", after: { type: input.type, enabled, disabled, kept, needsApproval, categories, accounts, mapped } });
      revalidatePath("/", "layout");
      return { enabled, disabled, kept, needsApproval, categories, accounts, mapped, mappingError };
    },
  });
  return run(input);
}
