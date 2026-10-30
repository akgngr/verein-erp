"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createAction } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { listAvailableDashboardCards } from "../queries/dashboard";
import { dashboardLayoutSchema } from "../schemas/dashboard-layout";

/** Panel düzenini kaydeder (yalnızca oturum sahibinin kendi paneli; ayrı yetki gerekmez). */
export async function saveDashboardLayoutAction(input: unknown): Promise<ActionResult<{ cards: string[] }>> {
  const run = createAction({
    schema: dashboardLayoutSchema,
    handler: async ({ input, user }) => {
      const allowed = new Set(listAvailableDashboardCards(user.role).map((entry) => entry.id));
      // Görülemeyen ya da tekrar eden kimlikler sessizce atlanır.
      const cards = [...new Set(input.cards)].filter((id) => allowed.has(id));
      await getDb().systemDashboardLayout.upsert({
        where: { userId: user.id },
        create: { userId: user.id, cards },
        update: { cards },
      });
      revalidatePath("/");
      return { cards };
    },
  });
  return run(input) as Promise<ActionResult<{ cards: string[] }>>;
}

/** Kayıtlı düzeni siler; panel varsayılan kartlara döner. */
export async function resetDashboardLayoutAction(): Promise<ActionResult<{ reset: true }>> {
  const run = createAction({
    schema: z.unknown(),
    handler: async ({ user }) => {
      await getDb().systemDashboardLayout.deleteMany({ where: { userId: user.id } });
      revalidatePath("/");
      return { reset: true as const };
    },
  });
  return run(undefined) as Promise<ActionResult<{ reset: true }>>;
}
