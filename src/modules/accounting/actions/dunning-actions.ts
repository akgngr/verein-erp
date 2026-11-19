"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingPermissions } from "../permissions";
import { invoiceIdSchema } from "../schemas/invoice";
import { createDunningForInvoice, DunningError } from "../services/dunning-create";
import { berlinToday } from "../utils";

/**
 * İhtar oluştur (ACC-6): bir sonraki kademe, ücret (ayarlar), § 288 BGB faizi (B2B: alıcının
 * USt-IdNr.'si varsa) ve yeni ödeme tarihi (+ kademe aralığı). Fatura değiştirilmez.
 */
export async function createDunningAction(input: unknown): Promise<ActionResult<{ id: string; level: number }>> {
  const run = createAction({
    permission: { definition: accountingPermissions, action: "update" },
    schema: invoiceIdSchema,
    handler: async ({ input, user, audit }) => {
      try {
        const created = await createDunningForInvoice(input.id, { id: user.id, label: buildUserLabel(user.name, user.email) }, berlinToday());
        await audit({ action: "CREATE", entity: "AccountingDunning", entityId: created.id, after: { invoice: created.invoiceNumber, level: created.level } });
        revalidatePath("/muhasebe/faturalar");
        revalidatePath(`/muhasebe/faturalar/${created.invoiceId}`);
        return { id: created.id, level: created.level };
      } catch (error) {
        if (error instanceof DunningError) throw new ActionError(error.message);
        throw error;
      }
    },
  });
  return run(input);
}
