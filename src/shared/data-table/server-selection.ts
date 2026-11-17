import "server-only";

import type { DataTableSelection } from "@/shared/data-table/selection-contract";
import {
  dataTableSelectionSchema,
  validateQuerySelectionFilters,
} from "@/shared/data-table/selection-contract";

export type ResolveBulkSelectionOptions = {
  allowedFilterKeys: readonly string[];
  maxExplicitIds?: number;
};

export function parseBulkSelection(
  input: unknown,
  options: ResolveBulkSelectionOptions,
): DataTableSelection {
  const selection = dataTableSelectionSchema.parse(input);
  const maxExplicitIds = options.maxExplicitIds ?? 1000;

  if (selection.type === "explicit" && selection.ids.length > maxExplicitIds) {
    throw new Error("DATA_TABLE_EXPLICIT_SELECTION_TOO_LARGE");
  }

  return validateQuerySelectionFilters(selection, options.allowedFilterKeys);
}

export async function resolveBulkSelection<T>(
  input: unknown,
  options: ResolveBulkSelectionOptions & {
    resolveExplicit: (ids: string[]) => Promise<T>;
    resolveQuery: (
      query: Extract<DataTableSelection, { type: "query" }>["query"],
      excludedIds: string[],
    ) => Promise<T>;
  },
): Promise<T> {
  const selection = parseBulkSelection(input, options);
  if (selection.type === "explicit") {
    return options.resolveExplicit(selection.ids);
  }
  return options.resolveQuery(selection.query, selection.excludedIds);
}
