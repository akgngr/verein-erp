import "server-only";

import { getDb } from "@/shared/db";

/**
 * Asistana tek tek açılıp kapatılabilen izinler. KARAR (KVKK/DSGVO): varsayılan hepsi KAPALI;
 * yönetici işaretlemedikçe asistan hiçbir veriye erişemez ve hiçbir öneri yapamaz.
 */
export const AI_AREAS = ["accounting", "reports", "members", "events", "tasks", "tasksPropose", "courses"] as const;
export type AiArea = (typeof AI_AREAS)[number];

export async function getEnabledAreas(): Promise<AiArea[]> {
  const row = await getDb().aiSettings.findUnique({ where: { id: "singleton" } });
  return (row?.enabledAreas ?? []).filter((area): area is AiArea => (AI_AREAS as readonly string[]).includes(area));
}

export async function setEnabledAreas(areas: AiArea[]): Promise<void> {
  const enabledAreas = AI_AREAS.filter((area) => areas.includes(area));
  await getDb().aiSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", provider: "", enabledAreas },
    update: { enabledAreas },
  });
}
