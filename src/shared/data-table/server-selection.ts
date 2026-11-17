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
