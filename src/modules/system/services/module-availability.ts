import "server-only";

import { allModules } from "@/registry";
import { isAccessApproved } from "@/shared/modules/module-access";

import { getAccessRecords } from "./module-access-store";
import { listActiveModuleKeys } from "./module-state-reader";

export type ModuleAvailability = "available" | "inactive" | "needsApproval";

/**
 * Framework-independent module availability checks shared by server pages and background workers.
 * Keep this file free of Next.js, React, and UI imports.
 */
export async function getModuleAvailability(key: string): Promise<ModuleAvailability> {
  const mod = allModules.find((candidate) => candidate.key === key);
  if (!mod || mod.category === "CORE") return "available";
  if (!(await listActiveModuleKeys([key])).includes(key)) return "inactive";
  if (!mod.access?.length) return "available";
  return isAccessApproved(mod, (await getAccessRecords())[key]) ? "available" : "needsApproval";
}

/** Menü, panel kartları ve worker kontrolleri için kullanılabilir modüller. */
export async function listUsableModuleKeys(): Promise<string[]> {
  const [records, activeKeys] = await Promise.all([getAccessRecords(), listActiveModuleKeys(allModules.map((mod) => mod.key))]);
  const active = new Set(activeKeys);
  return allModules
    .filter((mod) => mod.category === "CORE" || (active.has(mod.key) && isAccessApproved(mod, records[mod.key])))
    .map((mod) => mod.key);
}
