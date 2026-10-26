import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { CategoryListItem, CategoryOption } from "../types";

/** Form ve filtre seçenekleri: yalnızca aktif kategoriler, ada göre sıralı. */
export async function listActiveCategoryOptions(): Promise<CategoryOption[]> {
  const rows = await getDb().documentCategory.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => ({ id: row.id, label: row.name }));
}

const CATEGORY_SELECT = {
  id: true,
  name: true,
  isActive: true,
  createdAt: true,
  _count: { select: { documents: { where: { deletedAt: null } } } },
} satisfies Prisma.DocumentCategorySelect;

type CategoryRow = Prisma.DocumentCategoryGetPayload<{ select: typeof CATEGORY_SELECT }>;

/** Kategoriler ekranı (8.5): ad/durum/evrak sayısı; sayfalı basit tablo. */
export async function listCategories(
  params: ListParams<"name" | "isActive">,
): Promise<ListResult<CategoryListItem>> {
  const conditions: Prisma.DocumentCategoryWhereInput[] = [];
  if (params.q) {
    conditions.push({ name: { contains: params.q, mode: "insensitive" } });
  }
  if (params.filters.isActive === "active") conditions.push({ isActive: true });
  if (params.filters.isActive === "passive") conditions.push({ isActive: false });
  const where = conditions.length > 0 ? { AND: conditions } : {};

  const db = getDb();
  const [rows, total] = await Promise.all([
    db.documentCategory.findMany({
      where,
      select: CATEGORY_SELECT,
      orderBy: { [params.sort]: params.dir } as Prisma.DocumentCategoryOrderByWithRelationInput,
      skip: params.skip,
      take: params.take,
    }),
    db.documentCategory.count({ where }),
  ]);

  return {
    rows: rows.map((row: CategoryRow) => ({
      id: row.id,
      name: row.name,
      isActive: row.isActive,
      createdAt: row.createdAt,
      documentCount: row._count.documents,
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}
