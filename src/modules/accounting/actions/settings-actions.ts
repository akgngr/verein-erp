"use server";

import { getDb } from "@/shared/db";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingSetupPermissions } from "../permissions";
import { accountingSettingsSchema } from "../schemas/settings";

/**
 * Muhasebe ayarları güncelleme (§ 11.7): aidat kategorisi aktif INCOME kategorisi
 * olmalı; hesaplar aktif olmalıdır (KARAR: basit doğrulama — tutarlılık bu kadar).
 */
export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingSetupPermissions, action: "update" },
    schema: accountingSettingsSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();

      if (input.memberFeeCategoryId) {
        const category = await db.accountingCategory.findUnique({
          where: { id: input.memberFeeCategoryId },
        });
        if (!category || !category.isActive || category.direction !== "INCOME") {
          throw new ActionError("Aidat kategorisi aktif bir gelir kategorisi olmalıdır.", {
            memberFeeCategoryId: ["Aktif bir gelir kategorisi seçin."],
          });
        }
      }
      const accountFields: Array<[string, string | null]> = [
        ["cashAccountId", input.cashAccountId],
        ["bankAccountId", input.bankAccountId],
      ];
      for (const [key, id] of accountFields) {
        if (id) {
          const account = await db.accountingAccount.findUnique({ where: { id } });
          if (!account || !account.isActive) {
            throw new ActionError("Hesap bulunamadı veya devre dışı.", {
              [key]: ["Aktif bir hesap seçin."],
            });
          }
        }
      }

      if (input.donationCategoryId) {
        const category = await db.accountingCategory.findUnique({
          where: { id: input.donationCategoryId },
        });
        if (!category || !category.isActive || category.direction !== "INCOME") {
          throw new ActionError("Bağış kategorisi aktif bir gelir kategorisi olmalıdır.", {
            donationCategoryId: ["Aktif bir gelir kategorisi seçin."],
          });
        }
      }

      const label = buildUserLabel(user.name, user.email);
      await db.accountingSettings.upsert({
        where: { id: "singleton" },
        update: input,
        create: { id: "singleton", ...input },
      });

      await audit({
        action: "UPDATE",
        entity: "AccountingSettings",
        entityId: "singleton",
        after: {
          memberFeeCategoryId: input.memberFeeCategoryId,
          cashAccountId: input.cashAccountId,
          bankAccountId: input.bankAccountId,
          donationCategoryId: input.donationCategoryId,
        },
      });
      void label;

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
