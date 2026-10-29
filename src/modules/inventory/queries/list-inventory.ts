import "server-only";

import { getDb } from "@/shared/db";
import { requirePermission } from "@/modules/auth/server";
import { inventoryPermissions } from "../permissions";
import { MAX_INVENTORY_EXPORT_ROWS } from "../constants";
import {
  calculatePageCount,
  summarizeInventoryCategories,
  summarizeInventoryStats,
  toInventoryCategory,
  toInventoryStatus,
  toIsoDateString,
} from "../helpers/inventory-helpers";
import type {
  InventoryCategorySummary,
  InventoryFilters,
  InventoryItemRow,
  InventoryListResult,
  InventoryStats,
} from "../types";

type InventoryRecord = NonNullable<
  Awaited<ReturnType<ReturnType<typeof getDb>["inventoryItem"]["findFirst"]>>
>;

function toInventoryItemRow(item: InventoryRecord): InventoryItemRow {
  return {
    id: item.id,
    name: item.name,
    category: toInventoryCategory(item.category),
    serialNumber: item.serialNumber,
    location: item.location,
    quantity: item.quantity,
    status: toInventoryStatus(item.status),
    purchaseDate: toIsoDateString(item.purchaseDate),
    purchasePrice: item.purchasePrice === null ? null : item.purchasePrice.toNumber(),
    description: item.description,
    assignedMemberId: item.assignedMemberId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function buildWhere(filters: Pick<InventoryFilters, "search" | "category" | "status">) {
  const search = filters.search;
  return {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { serialNumber: { contains: search, mode: "insensitive" as const } },
            { location: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { assignedMemberId: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

function buildOrderBy(filters: Pick<InventoryFilters, "sort" | "direction">) {
  const direction = filters.direction;
  const nullable = { sort: direction, nulls: "last" as const };

  const primary = (() => {
    switch (filters.sort) {
      case "name":
        return { name: direction };
      case "category":
        return { category: direction };
      case "status":
        return { status: direction };
      case "quantity":
        return { quantity: direction };
      case "purchaseDate":
        return { purchaseDate: nullable };
      case "purchasePrice":
        return { purchasePrice: nullable };
      case "createdAt":
      default:
        return { createdAt: direction };
    }
  })();

  return [primary, { id: "asc" as const }];
}

/** Paginated, filtered and sorted inventory list. */
export async function listInventoryItems(filters: InventoryFilters): Promise<InventoryListResult> {
  await requirePermission(inventoryPermissions, "view");
  const db = getDb();
  const where = buildWhere(filters);

  const [items, total] = await Promise.all([
    db.inventoryItem.findMany({
      where,
      orderBy: buildOrderBy(filters),
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    db.inventoryItem.count({ where }),
  ]);

  return {
    items: items.map(toInventoryItemRow),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: calculatePageCount(total, filters.pageSize),
  };
}

/** Unpaginated (capped) list for exports, honoring search / filter / sort. */
export async function listInventoryItemsForExport(
  filters: InventoryFilters,
): Promise<InventoryItemRow[]> {
  await requirePermission(inventoryPermissions, "view");
  const db = getDb();

  const items = await db.inventoryItem.findMany({
    where: buildWhere(filters),
    orderBy: buildOrderBy(filters),
    take: MAX_INVENTORY_EXPORT_ROWS,
  });

  return items.map(toInventoryItemRow);
}

/** Overall stats: total quantity, quantity in use, quantity broken. */
export async function getInventoryStats(): Promise<InventoryStats> {
  await requirePermission(inventoryPermissions, "view");
  const db = getDb();

  const groups = await db.inventoryItem.groupBy({
    by: ["status"],
    _sum: { quantity: true },
    _count: { _all: true },
  });

  return summarizeInventoryStats(
    groups.map((group) => ({
      status: group.status,
      quantity: group._sum.quantity ?? 0,
      count: group._count._all,
    })),
  );
}

/** Per-category item count and total quantity (all categories, zero-filled). */
export async function getInventoryCategorySummary(): Promise<InventoryCategorySummary[]> {
  await requirePermission(inventoryPermissions, "view");
  const db = getDb();

  const groups = await db.inventoryItem.groupBy({
    by: ["category"],
    _sum: { quantity: true },
    _count: { _all: true },
  });

  return summarizeInventoryCategories(
    groups.map((group) => ({
      category: group.category,
      itemCount: group._count._all,
      totalQuantity: group._sum.quantity ?? 0,
    })),
  );
}
