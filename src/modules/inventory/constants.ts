import type {
  InventoryCategory,
  InventorySortDirection,
  InventorySortField,
  InventoryStatus,
} from "./types";

export const INVENTORY_BASE_PATH = "/inventory";

export const INVENTORY_CATEGORIES = [
  "ELECTRONICS",
  "FURNITURE",
  "KITCHEN",
  "OFFICE",
  "SPORTS",
  "OTHER",
] as const;

export const INVENTORY_STATUSES = ["IN_USE", "IDLE", "BROKEN", "SCRAPPED"] as const;

export const DEFAULT_INVENTORY_CATEGORY: InventoryCategory = "OTHER";
export const DEFAULT_INVENTORY_STATUS: InventoryStatus = "IDLE";

/** i18n keys (relative to the `inventory` namespace) for category labels. */
export const INVENTORY_CATEGORY_LABEL_KEYS: Record<InventoryCategory, string> = {
  ELECTRONICS: "categories.ELECTRONICS",
  FURNITURE: "categories.FURNITURE",
  KITCHEN: "categories.KITCHEN",
  OFFICE: "categories.OFFICE",
  SPORTS: "categories.SPORTS",
  OTHER: "categories.OTHER",
};

/** i18n keys (relative to the `inventory` namespace) for status labels. */
export const INVENTORY_STATUS_LABEL_KEYS: Record<InventoryStatus, string> = {
  IN_USE: "statuses.IN_USE",
  IDLE: "statuses.IDLE",
  BROKEN: "statuses.BROKEN",
  SCRAPPED: "statuses.SCRAPPED",
};

/** Tailwind classes for status badges (usable in both RSC and client components). */
export const INVENTORY_STATUS_BADGE_CLASSES: Record<InventoryStatus, string> = {
  IN_USE: "bg-success-100 text-success-700",
  IDLE: "bg-default-100 text-default-700",
  BROKEN: "bg-danger-100 text-danger-700",
  SCRAPPED: "bg-warning-100 text-warning-700",
};

export const INVENTORY_SORT_FIELDS = [
  "name",
  "category",
  "status",
  "quantity",
  "purchaseDate",
  "purchasePrice",
  "createdAt",
] as const;

export const INVENTORY_SORT_DIRECTIONS = ["asc", "desc"] as const;

export const DEFAULT_INVENTORY_SORT: InventorySortField = "createdAt";
export const DEFAULT_INVENTORY_SORT_DIRECTION: InventorySortDirection = "desc";

export const DEFAULT_INVENTORY_PAGE_SIZE = 10;
export const MAX_INVENTORY_PAGE_SIZE = 100;
export const MAX_INVENTORY_EXPORT_ROWS = 10000;

export const INVENTORY_QUANTITY_MAX = 100000;
export const INVENTORY_PRICE_MAX = 9999999999.99;
export const INVENTORY_CURRENCY = "EUR";
export const INVENTORY_CSV_SEPARATOR = ";";
