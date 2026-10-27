import "server-only";

import type { CategoryDirection } from "@prisma/client";

import { getDb } from "@/shared/db";

import type { CategoryOption } from "../types";

/** Kategori seçenekleri (§ 11.2): tümü; form yön filtreleyerek kullanır. */
export async function listCategoryOptions(
  direction?: CategoryDirection,
): Promise<CategoryOption[]> {
  const db = getDb();
  const rows = await db.accountingCategory.findMany({
    where: { isActive: true, ...(direction ? { direction } : {}) },
    orderBy: [{ direction: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      direction: true,
      sphere: true,
      isActive: true,
      helpText: true,
    },
  });
  return rows;
}

/** Ayarlar sekmesi: TÜM kategoriler + fiş sayısı (§ 11.4). */
export async function listAllCategories(): Promise<Array<{
  id: string;
  name: string;
  direction: string;
  sphere: string;
  helpText: string | null;
  isActive: boolean;
  bookingCount: number;
  sortOrder: number;
}>> {
  const db = getDb();
  const rows = await db.accountingCategory.findMany({
    orderBy: [{ direction: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      direction: true,
      sphere: true,
      helpText: true,
      isActive: true,
      sortOrder: true,
      _count: { select: { bookings: true } },
    },
  });
  return rows.map((row) => ({ ...row, bookingCount: row._count.bookings }));
}
