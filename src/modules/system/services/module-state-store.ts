import "server-only";

import { revalidatePath } from "next/cache";

import { moduleLifecycleRegistry } from "@/lifecycle-registry";
import { getDb } from "@/shared/db";

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

/**
 * Kullanıcı silinmeden önce tüm modüllerin `onUserDeleted` kancalarını çalıştırır (modül kapalı olsa da;
 * veri durur). Bir kanca hata verirse diğerleri yine çalışır; başarısız modüller döndürülür.
 */
export async function runUserDeletionHooks(userId: string): Promise<{ failed: string[] }> {
  const failed: string[] = [];
  for (const lifecycle of moduleLifecycleRegistry) {
    if (!lifecycle.onUserDeleted) continue;
    try {
      await lifecycle.onUserDeleted(userId);
    } catch (error) {
      failed.push(lifecycle.moduleKey);
      console.error(`[lifecycle] ${lifecycle.moduleKey}.onUserDeleted:`, error instanceof Error ? error.message.slice(0, 120) : "failed");
    }
  }
  return { failed };
}
