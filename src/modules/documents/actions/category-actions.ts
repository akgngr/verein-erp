"use server";

import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";

import { ActionError, createAction } from "@/modules/auth/server";

import { documentCategoriesPermissions } from "../permissions";
import {
  categoryCreateSchema,
  categorySetActiveSchema,
  categoryUpdateSchema,
} from "../schemas/category";

/**
 * Kategoriler silinmez, yalnızca pasife alınır (6. bölüm). Ad benzersizliği
 * büyük/küçük harf duyarsız kontrol edilir.
 */
async function assertNameAvailable(name: string, excludeId?: string): Promise<void> {
  const existing = await getDb().documentCategory.findFirst({
    where: { name: { equals: name, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing && existing.id !== excludeId) {
    throw new ActionError("Bu kategori adı zaten kullanımda.", {
      name: ["Bu kategori adı zaten kullanımda."],
    });
  }
}

export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const run = createAction({
    permission: { definition: documentCategoriesPermissions, action: "create" },
    schema: categoryCreateSchema,
    handler: async ({ input, audit }) => {
      await assertNameAvailable(input.name);

      const created = await getDb().documentCategory.create({
        data: { name: input.name },
      });

      await audit({
        action: "CREATE",
        entity: "DocumentCategory",
        entityId: created.id,
        after: { name: created.name, isActive: created.isActive },
      });

      return { id: created.id };
    },
  });

  return run(input) as Promise<ActionResult<{ id: string }>>;
}

export async function updateCategoryAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: documentCategoriesPermissions, action: "update" },
    schema: categoryUpdateSchema,
    handler: async ({ input, audit }) => {
      const category = await getDb().documentCategory.findUnique({ where: { id: input.id } });
      if (!category) throw new ActionError("Kategori bulunamadı.");

      await assertNameAvailable(input.name, category.id);

      const updated = await getDb().documentCategory.update({
        where: { id: category.id },
        data: { name: input.name },
      });

      await audit({
        action: "UPDATE",
        entity: "DocumentCategory",
        entityId: updated.id,
        before: { name: category.name, isActive: category.isActive },
        after: { name: updated.name, isActive: updated.isActive },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}

export async function setCategoryActiveAction(input: unknown): Promise<ActionResult> {
  const run = createAction({
    permission: { definition: documentCategoriesPermissions, action: "update" },
    schema: categorySetActiveSchema,
    handler: async ({ input, audit }) => {
      const category = await getDb().documentCategory.findUnique({ where: { id: input.id } });
      if (!category) throw new ActionError("Kategori bulunamadı.");

      const updated = await getDb().documentCategory.update({
        where: { id: category.id },
        data: { isActive: input.isActive },
      });

      await audit({
        action: input.isActive ? "ACTIVATE" : "DEACTIVATE",
        entity: "DocumentCategory",
        entityId: updated.id,
        before: { name: category.name, isActive: category.isActive },
        after: { name: updated.name, isActive: updated.isActive },
      });

      return undefined;
    },
  });

  return run(input) as Promise<ActionResult>;
}
