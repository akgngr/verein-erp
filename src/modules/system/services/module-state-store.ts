import "server-only";

import { revalidatePath } from "next/cache";

import { moduleLifecycleRegistry } from "@/lifecycle-registry";
import { getDb } from "@/shared/db";
import { getModuleStates } from "@/shared/modules/module-store";

/**
 * Modül açık/kapalı durumu. Varsayılanlar src/config/modules-state.json'dan (projeyle gelir),
 * yöneticinin yaptığı değişiklikler system_module_states tablosundan okunur ve önceliklidir.
 * KARAR: çalışma anında dosyaya yazılmaz; üretim imajında src/config yazılabilir değildir.
 */
export async function getEffectiveModuleStates(): Promise<Record<string, boolean>> {
  const rows = await getDb().systemModuleState.findMany({ select: { moduleKey: true, isEnabled: true } });
  const states = { ...getModuleStates() };
  for (const row of rows) states[row.moduleKey] = row.isEnabled;
  return states;
}

/** Kayıtlı modüllerden etkin olanlar; hiç kaydı olmayan yeni modüller etkindir. */
export async function listActiveModuleKeys(registeredKeys: string[]): Promise<string[]> {
  const states = await getEffectiveModuleStates();
  return registeredKeys.filter((key) => states[key] !== false);
}

export async function setModuleEnabled(key: string, isEnabled: boolean): Promise<void> {
  await getDb().systemModuleState.upsert({
    where: { moduleKey: key },
    create: { moduleKey: key, isEnabled },
    update: { isEnabled },
  });
  // Kapatılan modülün temizlik kancası (ör. demo verilerinin silinmesi); hata kapatmayı engellemez.
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
