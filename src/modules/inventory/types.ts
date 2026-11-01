import type {
  INVENTORY_CATEGORIES,
  INVENTORY_SORT_DIRECTIONS,
  INVENTORY_SORT_FIELDS,
  INVENTORY_STATUSES,
} from "./constants";

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];
export type InventoryStatus = (typeof INVENTORY_STATUSES)[number];
export type InventorySortField = (typeof INVENTORY_SORT_FIELDS)[number];
export type InventorySortDirection = (typeof INVENTORY_SORT_DIRECTIONS)[number];

/** Serializable inventory row passed from server to client components. */
export interface InventoryItemRow {
  id: string;
  name: string;
  category: InventoryCategory;
  serialNumber: string | null;
  location: string | null;
  quantity: number;
  status: InventoryStatus;
  /** ISO date string (YYYY-MM-DD) */
  purchaseDate: string | null;
  purchasePrice: number | null;
  description: string | null;
  assignedMemberId: string | null;
  /** Muhasebede demirbaş (AfA) olarak izleniyor mu. */
  trackAsAsset: boolean;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp */
  updatedAt: string;
}

export interface InventoryFilters {
  search: string;
  category: InventoryCategory | null;
  status: InventoryStatus | null;
  sort: InventorySortField;
  direction: InventorySortDirection;
  /** Sort explicitly chosen via URL (null = default sort). */
  requestedSort: InventorySortField | null;
  requestedDirection: InventorySortDirection | null;
  page: number;
  pageSize: number;
}

export interface InventoryListResult {
  items: InventoryItemRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface InventoryStats {
  itemCount: number;
  totalQuantity: number;
  inUseQuantity: number;
  brokenQuantity: number;
}

export interface InventoryStatusTotal {
  status: string;
  quantity: number;
  count: number;
}

export interface InventoryAbilities {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export type InventoryActionError = "forbidden" | "validation" | "notFound" | "unknown";

export type InventoryActionResult = { ok: true } | { ok: false; error: InventoryActionError };

export interface InventoryExportFile {
  filename: string;
  contentType: string;
  content: string;
}

export type InventorySearchParams = Record<string, string | string[] | undefined>;

export interface InventoryCategorySummary {
  category: InventoryCategory;
  itemCount: number;
  totalQuantity: number;
}

export interface InventoryCategoryTotal {
  category: string;
  itemCount: number;
  totalQuantity: number;
}
