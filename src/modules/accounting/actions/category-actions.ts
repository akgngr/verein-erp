"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { accountingSetupPermissions } from "../permissions";
import { categoryCreateSchema, categoryUpdateSchema } from "../schemas/category";

/** Kategori oluştur (§ 8 md. 12): ad benzersiz. */
export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: accountingSetupPermissions, action: "create" },
    schema: categoryCreateSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      try {
        const created = await db.accountingCategory.create({
          data: {
            name: input.name,
            direction: input.direction,
            sphere: input.sphere,
            helpText: input.helpText ?? null,
            sortOrder: 100,
          },
        });
        await audit({
          action: "CREATE",
          entity: "AccountingCategory",
          entityId: created.id,
          after: { name: created.name, direction: created.direction, sphere: created.sphere },
        });
        return { id: created.id };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new ActionError("accounting.errors.categoryNameTaken", {
            name: ["Farklı bir kategori adı girin."],
          });
        }
        throw error;
      }
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

const categoryEditSchema = z.object({
  id: z.string().min(1),
  name: categoryUpdateSchema.shape.name,
  direction: categoryUpdateSchema.shape.direction,
  sphere: categoryUpdateSchema.shape.sphere,
  helpText: categoryUpdateSchema.shape.helpText,
  isActive: categoryUpdateSchema.shape.isActive,
});

/**
 * Kategori güncelleme (§ 8 md. 12): yön/alan ilk fişten sonra DEĞİŞTİRİLEMEZ
 * (fiş varken gelen farklı yön/alan reddedilir, açıklayıcı metinle).
 */
export async function updateCategoryAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: accountingSetupPermissions, action: "update" },
    schema: categoryEditSchema,
    handler: async ({ input, audit }) => {
      const db = getDb();
      const existing = await db.accountingCategory.findUnique({ where: { id: input.id } });
      if (!existing) throw new ActionError("accounting.errors.categoryNotFound");

      const activeBookingCount = await db.accountingBooking.count({
        where: { categoryId: existing.id, reversedAt: null },
      });

      if (
        activeBookingCount > 0 &&
        (input.direction !== existing.direction || input.sphere !== existing.sphere)
      ) {
        throw new ActionError(
          "Bu kategoride fiş kayıtlı; yön (Gelir/Gider) ve alan (Sphere) değiştirilemez. Yeni bir kategori oluşturun.",
          {
            direction: ["Fişi olan kategoride yön değişmez."],
            sphere: ["Fişi olan kategoride alan değişmez."],
          },
        );
      }

      await db.accountingCategory.update({
        where: { id: existing.id },
        data: {
          name: input.name,
          direction: input.direction,
          sphere: input.sphere,
          helpText: input.helpText ?? null,
          isActive: input.isActive ?? existing.isActive,
        },
      });

      await audit({
        action:
          input.isActive === false
            ? "DEACTIVATE"
            : input.isActive === true
              ? "ACTIVATE"
              : "UPDATE",
        entity: "AccountingCategory",
        entityId: existing.id,
        before: { name: existing.name, isActive: existing.isActive },
        after: { name: input.name, isActive: input.isActive ?? existing.isActive },
      });
      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
