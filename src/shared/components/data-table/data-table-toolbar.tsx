"use client";

import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectItem,
} from "@heroui/react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { cn } from "@/shared/utils";
import type { DataTableFilter } from "./types";
import { useListQueryState } from "./use-list-query-state";

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
  topRightExtra,
  dateFilter,
  filterExtra,
  toolbarExtra,
}: {
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: DataTableFilter[];
  activeFilters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  topRightExtra?: React.ReactNode;
  dateFilter?: React.ReactNode;
  filterExtra?: React.ReactNode;
  toolbarExtra?: React.ReactNode;
}) {
  const searchParams = useSearchParams();
  const { setParams } = useListQueryState();
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Aktif filtre sayısı hesaplama (Arama ve Tarih hariç popover içindekiler)
  const activeSelectFiltersCount = Object.values(activeFilters).filter(
    (v) => Boolean(v) && v !== FILTER_ALL && v !== "*",
  ).length;

  const isMineActive = searchParams.get("filter.mine") === "1";
  const isOverdueActive = searchParams.get("filter.overdue") === "1";
  const extraFilterCount = (isMineActive ? 1 : 0) + (isOverdueActive ? 1 : 0);

  const activeFilterCount = activeSelectFiltersCount + extraFilterCount;

  // Herhangi bir filtre veya arama var mı?
  const hasActiveDate =
    Boolean(searchParams.get("filter.from")) || Boolean(searchParams.get("filter.to"));
  const hasAnyActive =
    Boolean(searchDraft) || activeFilterCount > 0 || hasActiveDate;

  // Tümünü Sıfırla (Arama, Tarih, Select filtreleri ve Hızlı filtreler)
  const handleResetAll = () => {
    onSearchDraftChange("");
    filters?.forEach((f) => onFilterChange(f.key, ""));

    const resetKeys: Record<string, null> = {
      q: null,
      "filter.from": null,
      "filter.to": null,
      "filter.mine": null,
      "filter.overdue": null,
    };
    if (filters) {
      filters.forEach((f) => {
        resetKeys[`filter.${f.key}`] = null;
      });
    }
    setParams(resetKeys, { resetPage: true });
  };

  // Yalnızca Popover içindeki filtreleri sıfırla
  const handleResetFiltersOnly = () => {
    filters?.forEach((f) => onFilterChange(f.key, ""));

    const resetKeys: Record<string, null> = {
      "filter.mine": null,
      "filter.overdue": null,
    };
    if (filters) {
      filters.forEach((f) => {
        resetKeys[`filter.${f.key}`] = null;
      });
    }
    setParams(resetKeys, { resetPage: true });
  };

  const hasFilterOptions = Boolean(filters && filters.length > 0) || Boolean(filterExtra);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Sol Küme: Arama Inputu + Tarih Filtresi + Sağına Temizle Butonu */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        <div className="w-full sm:w-64 md:w-72">
          <Input
            id="dt-search-input"
            className="w-full"
            size="sm"
            value={searchDraft}
            onValueChange={onSearchDraftChange}
            onClear={() => onSearchDraftChange("")}
            isClearable
            placeholder={searchPlaceholder ?? "Ara..."}
            startContent={<Search className="h-4 w-4 text-default-400 shrink-0" />}
            aria-label="Tabloda ara"
            classNames={{
              inputWrapper:
                "h-9 shadow-xs bg-default-100/60 hover:bg-default-100 border border-default-200/80 transition-colors rounded-xl",
            }}
          />
        </div>

        {dateFilter}

        {hasAnyActive ? (
          <Button
            id="dt-clear-all"
            size="sm"
            variant="light"
            color="danger"
            className="h-9 px-2.5 text-small font-medium text-default-500 hover:text-danger hover:bg-danger-50/60 rounded-xl transition-colors"
            onPress={handleResetAll}
            startContent={<X className="h-3.5 w-3.5" />}
          >
            Temizle
          </Button>
        ) : null}
      </div>

      {/* Sağ Küme: Gelen/Giden Filtresi (topRightExtra) + Sağ Tarafına Filtreler Menüsü */}
      <div className="flex flex-wrap items-center gap-2.5 ml-auto">
        {topRightExtra}

        {hasFilterOptions ? (
          <Popover
            isOpen={isFilterOpen}
            onOpenChange={setIsFilterOpen}
            placement="bottom-end"
            offset={8}
          >
            <PopoverTrigger>
              <Button
                id="dt-filters-trigger"
                size="sm"
                variant={activeFilterCount > 0 ? "flat" : "bordered"}
                color={activeFilterCount > 0 ? "primary" : "default"}
                className={cn(
                  "h-9 px-3 text-small font-medium transition-all shadow-xs border rounded-xl",
                  activeFilterCount > 0
                    ? "bg-primary-50 text-primary-700 border-primary-300 dark:bg-primary-500/20 dark:text-primary-300 dark:border-primary-500/40 font-semibold"
                    : "border-default-200/80 bg-default-100/60 hover:bg-default-100 text-default-700",
                )}
                startContent={
                  <SlidersHorizontal className="h-4 w-4 shrink-0 text-default-500" />
                }
                endContent={
                  activeFilterCount > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold px-1.5 shadow-xs">
                      {activeFilterCount}
                    </span>
                  ) : (
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-default-400 transition-transform duration-200",
                        isFilterOpen && "rotate-180",
                      )}
                    />
                  )
                }
              >
                <span>Filtreler</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="p-0 border border-default-200/80 shadow-2xl rounded-2xl bg-content1 overflow-hidden w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)]">
              <div className="flex flex-col">
                {/* Popover Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-default-200/80 bg-default-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-default-200/70 text-foreground flex items-center justify-center">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <h4 className="text-small font-semibold text-foreground">
                        Filtreler
                      </h4>
                      <p className="text-[11px] text-default-400">
                        Sonuçları daraltmak için seçim yapın
                      </p>
                    </div>
                  </div>
                  {activeFilterCount > 0 ? (
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      className="text-xs h-7 px-2 font-medium"
                      onPress={handleResetFiltersOnly}
                    >
                      Sıfırla
                    </Button>
                  ) : null}
                </div>

                {/* Popover Body */}
                <div className="p-4 flex flex-col gap-3.5 max-h-[60vh] overflow-y-auto">
                  {filters?.map((filter) => {
                    const currentValue = activeFilters[filter.key] ?? "";
                    return (
                      <div key={filter.key} className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-default-500 uppercase tracking-wider">
                          {filter.label}
                        </span>
                        <Select
                          size="sm"
                          aria-label={filter.label}
                          placeholder={`${filter.label} seçin`}
                          selectedKeys={currentValue ? [currentValue] : [FILTER_ALL]}
                          onSelectionChange={(keys) => {
                            const key =
                              keys === "all" ? undefined : Array.from(keys)[0];
                            const value = key === undefined ? "" : String(key);
                            onFilterChange(
                              filter.key,
                              value === FILTER_ALL ? "" : value,
                            );
                          }}
                          classNames={{
                            trigger:
                              "h-9 bg-default-100/60 hover:bg-default-100 border border-default-200/80 shadow-xs rounded-xl transition-colors",
                          }}
                        >
                          {[
                            { value: FILTER_ALL, label: "Tümü" },
                            ...filter.options,
                          ].map((option) => (
                            <SelectItem
                              key={option.value}
                              textValue={option.label}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>
                    );
                  })}

                  {filterExtra ? (
                    <div className="pt-2 border-t border-default-200/60 flex flex-col gap-2">
                      {filterExtra}
                    </div>
                  ) : null}
                </div>

                {/* Popover Footer */}
                <div className="px-4 py-2.5 bg-default-50/50 border-t border-default-200/80 flex items-center justify-between">
                  <span className="text-xs text-default-400 font-medium">
                    {activeFilterCount > 0
                      ? `${activeFilterCount} filtre aktif`
                      : "Filtre seçilmedi"}
                  </span>
                  <Button
                    size="sm"
                    onPress={() => setIsFilterOpen(false)}
                    className="h-8 px-4 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-lg shadow-xs transition-colors"
                  >
                    Tamam
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}

        {toolbarExtra}
      </div>
    </div>
  );
}
