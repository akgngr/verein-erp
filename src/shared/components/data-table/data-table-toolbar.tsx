"use client";

import { Input, Select, SelectItem } from "@heroui/react";
import { Search } from "lucide-react";

import type { DataTableFilter } from "./types";

// KARAR: HeroUI Select'te yerleşik "temizle" davranışı olmadığı için her filtre
// menüsüne "__all__" değerli "Tümü" seçeneği DataTable tarafından otomatik eklenir.
export const FILTER_ALL = "__all__";

export function DataTableToolbar({
  searchDraft,
  onSearchDraftChange,
  searchPlaceholder,
  filters,
  activeFilters,
  onFilterChange,
  toolbarExtra,
}: {
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: DataTableFilter[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  toolbarExtra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          className="w-full sm:max-w-xs"
          size="sm"
          value={searchDraft}
          onValueChange={onSearchDraftChange}
          onClear={() => onSearchDraftChange("")}
          isClearable
          placeholder={searchPlaceholder ?? "Ara..."}
          startContent={<Search className="h-4 w-4 text-default-400" />}
          aria-label="Tabloda ara"
        />
        {filters?.map((filter) => (
          <Select
            key={filter.key}
            className="w-full sm:max-w-[190px]"
            size="sm"
            label={filter.label}
            selectedKeys={
              activeFilters[filter.key] ? [activeFilters[filter.key]] : [FILTER_ALL]
            }
            onSelectionChange={(keys) => {
              const key = keys === "all" ? undefined : Array.from(keys)[0];
              const value = key === undefined ? "" : String(key);
              onFilterChange(filter.key, value === FILTER_ALL ? "" : value);
            }}
          >
            {[{ value: FILTER_ALL, label: "Tümü" }, ...filter.options].map((option) => (
              <SelectItem key={option.value} textValue={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </Select>
        ))}
      </div>
      {toolbarExtra ? <div className="flex items-center gap-2">{toolbarExtra}</div> : null}
    </div>
  );
}
