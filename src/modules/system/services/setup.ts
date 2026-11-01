import "server-only";

import { getDb } from "@/shared/db";

/** Kurulum sihirbazı durumu (SystemSetting anahtarları; ayrı tablo gerekmez). */
export const SETUP_KEYS = { type: "setup.organizationType", completedAt: "setup.completedAt" } as const;

export type OrganizationType = "VEREIN" | "KLEINGEWERBE" | "MITTELSTAND" | "FREELANCER" | "NACHHILFE";
export const ORGANIZATION_TYPES: OrganizationType[] = ["VEREIN", "KLEINGEWERBE", "MITTELSTAND", "FREELANCER", "NACHHILFE"];

/** Tür başına açılacak (OFFICIAL/EXTENSION) modüller; listede olmayan isteğe bağlı modüller kapatılır. */
export const MODULE_PRESETS: Record<OrganizationType, string[]> = {
  VEREIN: ["members", "donations", "meetings", "events", "documents", "inventory", "accounting", "exports", "tasks"],
  KLEINGEWERBE: ["accounting", "documents", "inventory", "exports", "tasks"],
  MITTELSTAND: ["accounting", "documents", "inventory", "exports", "tasks", "meetings"],
  FREELANCER: ["accounting", "documents", "exports", "tasks"],
  NACHHILFE: ["students", "courses", "progress", "accounting", "documents", "exports", "tasks"],
};

/** Sihirbazın açıp kapattığı isteğe bağlı modüller (AI gibi eklentilere dokunulmaz). */
export const PRESET_MANAGED_MODULES = ["members", "donations", "meetings", "events", "documents", "inventory", "accounting", "exports", "tasks", "students", "courses", "progress"];

export async function getSetupState(): Promise<{ type: OrganizationType | null; completedAt: Date | null }> {
  const rows = await getDb().systemSetting.findMany({ where: { key: { in: [SETUP_KEYS.type, SETUP_KEYS.completedAt] } } });
  const value = (key: string) => rows.find((row) => row.key === key)?.value ?? null;
  const type = value(SETUP_KEYS.type);
  const completed = value(SETUP_KEYS.completedAt);
  return { type: type && (ORGANIZATION_TYPES as string[]).includes(type) ? (type as OrganizationType) : null, completedAt: completed ? new Date(completed) : null };
}
