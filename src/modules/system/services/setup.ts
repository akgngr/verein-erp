import "server-only";

import { getDb } from "@/shared/db";

/** Kurulum sihirbazı durumu (SystemSetting anahtarları; ayrı tablo gerekmez). */
export const SETUP_KEYS = { type: "setup.organizationType", completedAt: "setup.completedAt" } as const;

export type OrganizationType = "VEREIN" | "KLEINGEWERBE" | "MITTELSTAND" | "FREELANCER" | "NACHHILFE";
export const ORGANIZATION_TYPES: OrganizationType[] = ["VEREIN", "KLEINGEWERBE", "MITTELSTAND", "FREELANCER", "NACHHILFE"];

/**
 * Tür başına önerilen (OFFICIAL/EXTENSION) modüller. #583: Sihirbaz listede olmayan açık modülü artık sessizce
 * kapatmaz; kapatma yalnız özet adımında açıkça onaylananlar için yapılır. Dernek ön ayarı SEPA, CRM,
 * toplu e-posta ve hibe yönetimini de içerir (zorunlu bağımlılıklar, örn. otomasyon, birlikte açılır).
 */
export const MODULE_PRESETS: Record<OrganizationType, string[]> = {
  VEREIN: ["members", "donations", "meetings", "events", "documents", "inventory", "accounting", "tasks", "sepa", "crm", "mailings", "grants"],
  KLEINGEWERBE: ["accounting", "documents", "inventory", "tasks"],
  MITTELSTAND: ["accounting", "documents", "inventory", "tasks", "meetings"],
  FREELANCER: ["accounting", "documents", "tasks"],
  NACHHILFE: ["students", "courses", "progress", "accounting", "documents", "tasks"],
};

/** Sihirbazın açıp kapattığı isteğe bağlı modüller (AI gibi eklentilere dokunulmaz). */
export const PRESET_MANAGED_MODULES = ["members", "donations", "meetings", "events", "documents", "inventory", "accounting", "tasks", "sepa", "crm", "mailings", "grants", "students", "courses", "progress"];

export async function getSetupState(): Promise<{ type: OrganizationType | null; completedAt: Date | null }> {
  const rows = await getDb().systemSetting.findMany({ where: { key: { in: [SETUP_KEYS.type, SETUP_KEYS.completedAt] } } });
  const value = (key: string) => rows.find((row) => row.key === key)?.value ?? null;
  const type = value(SETUP_KEYS.type);
  const completed = value(SETUP_KEYS.completedAt);
  return { type: type && (ORGANIZATION_TYPES as string[]).includes(type) ? (type as OrganizationType) : null, completedAt: completed ? new Date(completed) : null };
}
