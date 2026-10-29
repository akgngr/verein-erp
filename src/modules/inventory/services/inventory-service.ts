import "server-only";

import { getLocale, getTranslations } from "next-intl/server";
import { ForbiddenError, requirePermission } from "@/modules/auth/server";
import { inventoryPermissions } from "../permissions";
import { INVENTORY_CATEGORY_LABEL_KEYS, INVENTORY_STATUS_LABEL_KEYS } from "../constants";
import {
  formatDecimalForExport,
  parseInventoryFilters,
  toCsvLine,
} from "../helpers/inventory-helpers";
import { listInventoryItemsForExport } from "../queries/list-inventory";
import type { InventoryAbilities, InventoryExportFile, InventorySearchParams } from "../types";

type InventoryAction = "view" | "create" | "update" | "delete";

async function hasInventoryPermission(action: InventoryAction): Promise<boolean> {
  try {
    await requirePermission(inventoryPermissions, action);
    return true;
  } catch (error) {
    if (error instanceof ForbiddenError) return false;
    throw error;
  }
}

/** Resolves which inventory operations the current user may perform. */
export async function getInventoryAbilities(): Promise<InventoryAbilities> {
  const [canView, canCreate, canUpdate, canDelete] = await Promise.all([
    hasInventoryPermission("view"),
    hasInventoryPermission("create"),
    hasInventoryPermission("update"),
    hasInventoryPermission("delete"),
  ]);
  return { canView, canCreate, canUpdate, canDelete };
}

/**
 * Builds an Excel-compatible CSV export (UTF-8 BOM, ";" separator) of the
 * inventory, honoring the same search / filter / sort params as the list page.
 * Intended to be served from the `/api/inventory/export` route declared in module.config.ts (menu).
 */
export async function exportInventoryCsv(
  searchParams: InventorySearchParams,
): Promise<InventoryExportFile> {
  const filters = parseInventoryFilters(searchParams);
  const [items, t, locale] = await Promise.all([
    listInventoryItemsForExport(filters),
    getTranslations("inventory"),
    getLocale(),
  ]);

  const header = toCsvLine([
    t("fields.name"),
    t("fields.category"),
    t("fields.serialNumber"),
    t("fields.location"),
    t("fields.quantity"),
    t("fields.status"),
    t("fields.purchaseDate"),
    t("fields.purchasePrice"),
    t("fields.assignedMemberId"),
    t("fields.description"),
  ]);

  const rows = items.map((item) =>
    toCsvLine([
      item.name,
      t(INVENTORY_CATEGORY_LABEL_KEYS[item.category]),
      item.serialNumber,
      item.location,
      item.quantity,
      t(INVENTORY_STATUS_LABEL_KEYS[item.status]),
      item.purchaseDate,
      formatDecimalForExport(item.purchasePrice, locale),
      item.assignedMemberId,
      item.description,
    ]),
  );

  const date = new Date().toISOString().slice(0, 10);

  return {
    filename: `${t("export.filePrefix")}-${date}.csv`,
    contentType: "text/csv; charset=utf-8",
    content: `﻿${[header, ...rows].join("\r\n")}\r\n`,
  };
}
