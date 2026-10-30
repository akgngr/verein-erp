import "server-only";

import { dashboardCards } from "@/dashboard-cards";
import { allModules } from "@/registry";
import { can } from "@/shared/permissions/define";
import type { Role } from "@/shared/roles";
import { getDb } from "@/shared/db";
import type { DashboardCardDefinition } from "@/shared/types/dashboard";

import { listUsableModuleKeys } from "../services/module-gate";

export type AvailableDashboardCard = { id: string; moduleKey: string; card: DashboardCardDefinition };

/** Kullanıcının görebileceği kartlar: modül etkin ve kartın yetkisi var. */
export function listAvailableDashboardCards(role: Role): AvailableDashboardCard[] {
  const active = new Set(listUsableModuleKeys());
  return dashboardCards
    .filter((entry) => active.has(entry.moduleKey))
    .flatMap((entry) =>
      entry.cards
        .filter((card) => can(role, card.permission.definition, card.permission.action))
        .map((card) => ({ id: `${entry.moduleKey}.${card.key}`, moduleKey: entry.moduleKey, card })),
    );
}

/**
 * Kullanıcının panel düzeni (sıralı kart kimlikleri). Kayıt yoksa `defaultVisible` kartlar;
 * artık görülemeyen (modül kapalı, yetki yok, kart kaldırıldı) kimlikler atlanır.
 */
export async function getDashboardLayout(userId: string, available: AvailableDashboardCard[]): Promise<string[]> {
  const saved = await getDb().systemDashboardLayout.findUnique({ where: { userId } });
  const ids = new Set(available.map((entry) => entry.id));
  if (!saved) return available.filter((entry) => entry.card.defaultVisible).map((entry) => entry.id);
  return saved.cards.filter((id) => ids.has(id));
}
