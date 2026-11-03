import "server-only";

import { revalidatePath } from "next/cache";

import { moduleLifecycleRegistry } from "@/lifecycle-registry";
import { getDb } from "@/shared/db";
import { getEffectiveModuleStates } from "./module-state-reader";

export { getEffectiveModuleStates, listActiveModuleKeys } from "./module-state-reader";

/**
 * Modül durumu değişikliği yalnızca Next.js uygulama katmanından çağrılır:
 * lifecycle kancalarını çalıştırır ve ilgili cache'i yeniler.
 */
export async function setModuleEnabled(key: string, isEnabled: boolean): Promise<void> {
  await getDb().systemModuleState.upsert({
    where: { moduleKey: key },
    create: { moduleKey: key, isEnabled },
    update: { isEnabled },
  });
  if (!isEnabled) {
    for (const lifecycle of moduleLifecycleRegistry.filter((entry) => entry.moduleKey === key)) {
      try {
        await lifecycle.onDisable?.();
      } catch (err) {
        console.error(`[modules] onDisable failed for ${key}:`, err);
      }
    }
  }
  revalidatePath("/", "layout");
}
