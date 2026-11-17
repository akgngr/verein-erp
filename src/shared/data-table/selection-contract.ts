import { z } from "zod";

export type DataTableQuerySnapshot = {
  q?: string;
  filters: Record<string, string>;
  sort?: string;
  dir?: "asc" | "desc";
};

export type DataTableSelection =
  | { type: "explicit"; ids: string[] }
  | {
      type: "query";
      query: DataTableQuerySnapshot;
      excludedIds: string[];
    };

export const dataTableQuerySnapshotSchema = z.object({
  q: z.string().trim().max(100).optional(),
  filters: z.record(z.string(), z.string().max(200)),
  sort: z.string().max(100).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
}).strict();

export const dataTableSelectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("explicit"),
    ids: z.array(z.string().min(1).max(191)).max(1000),
  }).strict(),
  z.object({
    type: z.literal("query"),
    query: dataTableQuerySnapshotSchema,
    excludedIds: z.array(z.string().min(1).max(191)).max(1000),
  }).strict(),
]);

export function selectedCount(selection: DataTableSelection, total: number): number {
  if (selection.type === "explicit") return selection.ids.length;
  return Math.max(0, total - selection.excludedIds.length);
}

export function selectedIdsForPage(
  selection: DataTableSelection,
  visibleIds: readonly string[],
): string[] {
  if (selection.type === "explicit") {
    const selected = new Set(selection.ids);
    return visibleIds.filter((id) => selected.has(id));
  }
  const excluded = new Set(selection.excludedIds);
  return visibleIds.filter((id) => !excluded.has(id));
}

export function applyPageSelection(
  selection: DataTableSelection,
  selectedVisibleIds: readonly string[],
  visibleIds: readonly string[],
): DataTableSelection {
  if (selection.type === "explicit") {
    return { type: "explicit", ids: [...selectedVisibleIds] };
  }

  const visible = new Set(visibleIds);
  const selected = new Set(selectedVisibleIds);
  const preservedExcluded = selection.excludedIds.filter((id) => !visible.has(id));
  const pageExcluded = visibleIds.filter((id) => !selected.has(id));

  return {
    ...selection,
    excludedIds: [...preservedExcluded, ...pageExcluded],
  };
}

export function buildQuerySnapshot(
  searchParams: URLSearchParams,
  options: { q?: string; sort?: string; dir?: "asc" | "desc" },
): DataTableQuerySnapshot {
  const filters: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("filter.") && value) {
      filters[key.slice("filter.".length)] = value;
    }
  }

  return {
    ...(options.q ? { q: options.q } : {}),
    filters,
    ...(options.sort ? { sort: options.sort } : {}),
    ...(options.dir ? { dir: options.dir } : {}),
  };
}

export function validateQuerySelectionFilters(
  selection: DataTableSelection,
  allowedFilterKeys: readonly string[],
): DataTableSelection {
  const parsed = dataTableSelectionSchema.parse(selection);
  if (parsed.type === "explicit") return parsed;

  const allowed = new Set(allowedFilterKeys);
  for (const key of Object.keys(parsed.query.filters)) {
    if (!allowed.has(key)) {
      throw new Error(`DATA_TABLE_FILTER_NOT_ALLOWED:${key}`);
    }
  }
  return parsed;
}

export function sameQuerySnapshot(
  left: DataTableQuerySnapshot,
  right: DataTableQuerySnapshot,
): boolean {
  if ((left.q ?? "") !== (right.q ?? "")) return false;
  if ((left.sort ?? "") !== (right.sort ?? "")) return false;
  if ((left.dir ?? "") !== (right.dir ?? "")) return false;

  const leftKeys = Object.keys(left.filters).sort();
  const rightKeys = Object.keys(right.filters).sort();
  if (leftKeys.length !== rightKeys.length) return false;

  return leftKeys.every(
    (key, index) =>
      key === rightKeys[index] && left.filters[key] === right.filters[key],
  );
}
