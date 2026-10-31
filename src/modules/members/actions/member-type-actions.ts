"use server";

import { getDb } from "@/shared/db";
import { toCents, centsToDecimalString } from "@/shared/money";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { memberTypesPermissions } from "../permissions";
import { memberTypeConfigUpdateSchema } from "../schemas/member-type";

/**
 * Üyelik türü konfigürasyonu güncelleme (Faz 3 eklemeleri).
 *
 * KARAR: Tür ekleme/silme yoktur (enum sabittir) — yalnız yıllık aidat tutarı
 * ve aktiflik güncellenir. Tutar değişimi mevcut aidat satırlarını etkilemez
 * (tutar satır üretiminde anlık görüntülenir). Konfigürasyon satırı yoksa
 * upsert ile oluşturulur (seed garantisi + emniyet).
 */
export async function updateMembershipTypeConfigAction(
  input: unknown,
): Promise<ActionResult<{ type: string; annualDueCents: number | null; isActive: boolean }>> {
  const run = createAction({
    permission: { definition: memberTypesPermissions, action: "update" },
    schema: memberTypeConfigUpdateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();

      let annualDueCents: number | null = null;
      if (input.annualDue !== null) {
        const cents = toCents(input.annualDue);
        if (cents === null || cents < 0) {
          throw new ActionError("members.errors.amountInvalid", {
            annualDue: ["members.validation.annualDueInvalid"],
          });
        }
        if (cents > 999_999_999) {
          throw new ActionError("members.errors.amountTooLarge", {
            annualDue: ["members.validation.amountTooLarge"],
          });
        }
        annualDueCents = cents;
      }

      const before = await db.membershipTypeConfig.findUnique({
        where: { type: input.type },
      });

      const row = await db.membershipTypeConfig.upsert({
        where: { type: input.type },
        update: {
          annualDue: annualDueCents === null ? null : centsToDecimalString(annualDueCents),
          isActive: input.isActive,
        },
        create: {
          type: input.type,
          annualDue: annualDueCents === null ? null : centsToDecimalString(annualDueCents),
          isActive: input.isActive,
        },
      });

      await audit({
        action: before ? "UPDATE" : "CREATE",
        entity: "MembershipTypeConfig",
        entityId: input.type,
        before: before
          ? {
              annualDueCents: before.annualDue === null ? null : Number(before.annualDue.mul(100).toFixed(0)),
              isActive: before.isActive,
            }
          : null,
        after: { annualDueCents, isActive: input.isActive },
      });

      return { type: row.type, annualDueCents, isActive: row.isActive };
    },
  });

  return run(input) as Promise<ActionResult<{
    type: string;
    annualDueCents: number | null;
    isActive: boolean;
  }>>;
}
