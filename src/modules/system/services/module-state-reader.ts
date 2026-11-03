import "server-only";

import { getDb } from "@/shared/db";
import { getModuleStates } from "@/shared/modules/module-store";

/**
 * Read-only module state access for server services and background workers.
 * Keep this module free of Next.js cache/revalidation and lifecycle dependencies.
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
