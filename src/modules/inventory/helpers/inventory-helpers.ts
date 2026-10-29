import {
  DEFAULT_INVENTORY_CATEGORY,
  DEFAULT_INVENTORY_PAGE_SIZE,
  DEFAULT_INVENTORY_SORT,
  DEFAULT_INVENTORY_SORT_DIRECTION,
  DEFAULT_INVENTORY_STATUS,
  INVENTORY_BASE_PATH,
  INVENTORY_CATEGORIES,
  INVENTORY_CSV_SEPARATOR,
  INVENTORY_CURRENCY,
  INVENTORY_SORT_DIRECTIONS,
  INVENTORY_SORT_FIELDS,
  INVENTORY_STATUS_BADGE_CLASSES,
  INVENTORY_STATUSES,
  MAX_INVENTORY_PAGE_SIZE,
} from "../constants";
import type { InventoryFormValues } from "../schemas/inventory-schema";
import type {
  InventoryCategory,
  InventoryCategorySummary,
  InventoryCategoryTotal,
  InventoryFilters,
  InventoryItemRow,
  InventorySearchParams,
  InventorySortDirection,
  InventorySortField,
  InventoryStats,
  InventoryStatus,
  InventoryStatusTotal,
} from "../types";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const EMPTY_VALUE = "—";

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

export function isInventoryCategory(value: unknown): value is InventoryCategory {
  return typeof value === "string" && (INVENTORY_CATEGORIES as readonly string[]).includes(value);
}

export function isInventoryStatus(value: unknown): value is InventoryStatus {
  return typeof value === "string" && (INVENTORY_STATUSES as readonly string[]).includes(value);
}

export function isInventorySortField(value: unknown): value is InventorySortField {
  return typeof value === "string" && (INVENTORY_SORT_FIELDS as readonly string[]).includes(value);
}

export function isInventorySortDirection(value: unknown): value is InventorySortDirection {
  return (
    typeof value === "string" && (INVENTORY_SORT_DIRECTIONS as readonly string[]).includes(value)
  );
}

export function toInventoryCategory(value: string): InventoryCategory {
  return isInventoryCategory(value) ? value : DEFAULT_INVENTORY_CATEGORY;
}

export function toInventoryStatus(value: string): InventoryStatus {
  return isInventoryStatus(value) ? value : DEFAULT_INVENTORY_STATUS;
}

// ---------------------------------------------------------------------------
// Search params / filters
// ---------------------------------------------------------------------------

export function getSingleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value: string | undefined, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return max !== undefined ? Math.min(parsed, max) : parsed;
}

export function parseInventoryFilters(params: InventorySearchParams): InventoryFilters {
  // Param names follow the shared DataTable URL state: q, filter.<key>, sort, dir, page, pageSize.
  const category = getSingleParam(params["filter.category"]);
  const status = getSingleParam(params["filter.status"]);
  const sort = getSingleParam(params.sort);
  const direction = getSingleParam(params.dir);
  const requestedSort = isInventorySortField(sort) ? sort : null;
  const requestedDirection =
    requestedSort && isInventorySortDirection(direction) ? direction : null;

  return {
    search: (getSingleParam(params.q) ?? "").trim(),
    category: isInventoryCategory(category) ? category : null,
    status: isInventoryStatus(status) ? status : null,
    sort: requestedSort ?? DEFAULT_INVENTORY_SORT,
    direction: requestedDirection ?? DEFAULT_INVENTORY_SORT_DIRECTION,
    requestedSort,
    requestedDirection,
    page: parsePositiveInt(getSingleParam(params.page), 1),
    pageSize: parsePositiveInt(
      getSingleParam(params.pageSize),
      DEFAULT_INVENTORY_PAGE_SIZE,
      MAX_INVENTORY_PAGE_SIZE,
    ),
  };
}

export function hasActiveInventoryFilters(filters: InventoryFilters): boolean {
  return filters.search !== "" || filters.category !== null || filters.status !== null;
}

export function isCreateModalRequested(params: InventorySearchParams): boolean {
  // Form standardı `?yeni`; eski `?action=new` bağlantıları da açar.
  return params.yeni !== undefined || getSingleParam(params.action) === "new";
}

/** Returns the query string without the given key (no leading "?"). */
export function removeSearchParam(query: string, key: string): string {
  const params = new URLSearchParams(query);
  params.delete(key);
  return params.toString();
}

export function calculatePageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Converts a "YYYY-MM-DD" string to a UTC Date (or null when empty/invalid). */
export function parseIsoDate(value: string | undefined | null): Date | null {
  if (!value || !isValidIsoDate(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

/** Converts a Date to a "YYYY-MM-DD" string (UTC). */
export function toIsoDateString(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

export function formatIsoDate(value: string | null, locale: string): string {
  if (!value || !isValidIsoDate(value)) return EMPTY_VALUE;
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

// ---------------------------------------------------------------------------
// Numbers / currency
// ---------------------------------------------------------------------------

export function formatCurrency(value: number | null, locale: string): string {
  if (value === null) return EMPTY_VALUE;
  return new Intl.NumberFormat(locale, { style: "currency", currency: INVENTORY_CURRENCY }).format(
    value,
  );
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Plain decimal for CSV export (locale decimal separator, no grouping). */
export function formatDecimalForExport(value: number | null, locale: string): string {
  if (value === null) return "";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(value);
}

// ---------------------------------------------------------------------------
// Status / stats
// ---------------------------------------------------------------------------

export function getStatusBadgeClass(status: InventoryStatus): string {
  return INVENTORY_STATUS_BADGE_CLASSES[status];
}

export function summarizeInventoryStats(totals: InventoryStatusTotal[]): InventoryStats {
  return totals.reduce<InventoryStats>(
    (stats, entry) => ({
      itemCount: stats.itemCount + entry.count,
      totalQuantity: stats.totalQuantity + entry.quantity,
      inUseQuantity: stats.inUseQuantity + (entry.status === "IN_USE" ? entry.quantity : 0),
      brokenQuantity: stats.brokenQuantity + (entry.status === "BROKEN" ? entry.quantity : 0),
    }),
    { itemCount: 0, totalQuantity: 0, inUseQuantity: 0, brokenQuantity: 0 },
  );
}

/** Returns one summary row per known category (zero-filled), in display order. */
export function summarizeInventoryCategories(
  totals: InventoryCategoryTotal[],
): InventoryCategorySummary[] {
  return INVENTORY_CATEGORIES.map((category) => {
    const matches = totals.filter((entry) => toInventoryCategory(entry.category) === category);
    return {
      category,
      itemCount: matches.reduce((sum, entry) => sum + entry.itemCount, 0),
      totalQuantity: matches.reduce((sum, entry) => sum + entry.totalQuantity, 0),
    };
  });
}

export function sumCategorySummaries(
  summaries: InventoryCategorySummary[],
): Pick<InventoryCategorySummary, "itemCount" | "totalQuantity"> {
  return summaries.reduce(
    (sum, row) => ({
      itemCount: sum.itemCount + row.itemCount,
      totalQuantity: sum.totalQuantity + row.totalQuantity,
    }),
    { itemCount: 0, totalQuantity: 0 },
  );
}

export function buildCategoryFilterHref(category: InventoryCategory): string {
  return `${INVENTORY_BASE_PATH}?${new URLSearchParams({ "filter.category": category }).toString()}`;
}

// ---------------------------------------------------------------------------
// Form <-> persistence mapping
// ---------------------------------------------------------------------------

export function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function toInventoryFormValues(item: InventoryItemRow | null): InventoryFormValues {
  return {
    name: item?.name ?? "",
    category: item?.category ?? DEFAULT_INVENTORY_CATEGORY,
    serialNumber: item?.serialNumber ?? "",
    location: item?.location ?? "",
    quantity: item?.quantity ?? 1,
    status: item?.status ?? DEFAULT_INVENTORY_STATUS,
    purchaseDate: item?.purchaseDate ?? "",
    purchasePrice: item?.purchasePrice ?? null,
    description: item?.description ?? "",
    assignedMemberId: item?.assignedMemberId ?? "",
  };
}

export function toInventoryWriteData(values: InventoryFormValues) {
  return {
    name: values.name.trim(),
    category: values.category,
    serialNumber: emptyToNull(values.serialNumber),
    location: emptyToNull(values.location),
    quantity: values.quantity,
    status: values.status,
    purchaseDate: parseIsoDate(values.purchaseDate),
    purchasePrice: values.purchasePrice,
    description: emptyToNull(values.description),
    assignedMemberId: emptyToNull(values.assignedMemberId),
  };
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

export function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/["\r\n]/.test(text) || text.includes(INVENTORY_CSV_SEPARATOR)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsvLine(values: Array<string | number | null | undefined>): string {
  return values.map(escapeCsvValue).join(INVENTORY_CSV_SEPARATOR);
}
