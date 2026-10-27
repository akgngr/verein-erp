"use server";

import { getDb } from "@/shared/db";
import { toCents } from "@/shared/money";
import { buildUserLabel } from "@/shared/utils";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingSetupPermissions } from "../permissions";
import { budgetSaveSchema } from "../schemas/budget";

/**
 * Bütçe kaydetme (§ 8 md. 16): tüm DEĞİŞEN satırlar TEK transaction'da yazılır;
 * boş/0 tutar satırı SİLİNİR; kilitli yıl reddedilir.
 */
export async function saveBudgetAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingSetupPermissions, action: "update" },
    schema: budgetSaveSchema,
    handler: async ({ input, user, audit }) => {
      const db = getDb();
      const label = buildUserLabel(user.name, user.email);

      const lock = await db.accountingYear.findUnique({ where: { year: input.year } });
      if (lock?.lockedAt) {
        throw new ActionError(`${input.year} yılı kilitli; bütçe düzenlenemez.`);
      }

      // Değişen satırları belirlemek için mevcut planı oku.
      const existingLines = await db.accountingBudgetLine.findMany({
        where: { year: input.year },
        select: { categoryId: true, amount: true },
      });
      const existingMap = new Map(
        existingLines.map((line) => [line.categoryId, Number(line.amount.mul(100).toFixed(0))]),
      );

      const categories = await db.accountingCategory.findMany({
        where: { id: { in: input.lines.map((line) => line.categoryId) } },
        select: { id: true },
      });
      const categoryIds = new Set(categories.map((category) => category.id));

      let changedCount = 0;
      await db.$transaction(async (tx) => {
        for (const line of input.lines) {
          if (!categoryIds.has(line.categoryId)) continue;

          const targetCents = line.amount.trim() === "" ? 0 : toCents(line.amount);
          if (targetCents === null || targetCents < 0) {
            throw new ActionError("Bütçe tutarı geçersiz.", {
              lines: ["Tutarlar 0 veya pozitif olmalıdır."],
            });
          }

          const currentCents = existingMap.get(line.categoryId) ?? 0;
          if (currentCents === targetCents) continue;

          if (targetCents === 0) {
            await tx.accountingBudgetLine.deleteMany({
              where: { year: input.year, categoryId: line.categoryId },
            });
          } else {
            await tx.accountingBudgetLine.upsert({
              where: { year_categoryId: { year: input.year, categoryId: line.categoryId } },
              update: { amount: (targetCents / 100).toFixed(2) },
              create: {
                year: input.year,
                categoryId: line.categoryId,
                amount: (targetCents / 100).toFixed(2),
              },
            });
          }
          changedCount += 1;
        }
      });

      await audit({
        action: "BUDGET_SAVE",
        entity: "AccountingBudgetLine",
        entityId: undefined,
        after: { year: input.year, changedCount },
      });
      void label;

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
