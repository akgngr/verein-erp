"use client";

import {
  Button,
  Drawer,
  Label,
  ListBox,
  Popover,
  SearchField,
  Select,
} from "@heroui/react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { BOTTOM_SHEET_CLASS, SheetHandle } from "@/shared/components/forms/form-drawer";
import { DialogDismissButton } from "@/shared/components/ui/dialog-dismiss-button";
import { useIsDesktop } from "@/shared/hooks/use-media-query";
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
  const tCommon = useTranslations("common");
  const tTable = useTranslations("common.table");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const isDesktop = useIsDesktop();

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
    Boolean(searchParams.get("filter.from")) ||
    Boolean(searchParams.get("filter.to"));
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

  const filterPanel = (
              <>
                {/* Popover Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200/80 bg-ink-50/50">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-lg bg-ink-200/70 text-foreground flex items-center justify-center">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <h4 className="text-sm font-semibold text-foreground">
                        {tTable("filters")}
                      </h4>
                      <p className="text-[11px] text-ink-400">
                        {tTable("filtersHint")}
                      </p>
                    </div>
                  </div>
                  {activeFilterCount > 0 ? (
                    <Button
                      size="sm"
                      variant="danger-soft"
                      className="text-xs h-7 px-2 font-medium"
                      onPress={handleResetFiltersOnly}
                    >
                      {tTable("reset")}
                    </Button>
                  ) : null}
                </div>

                {/* Popover Body */}
                <div className={cn("p-4 flex flex-col gap-3.5 overflow-y-auto", isDesktop ? "max-h-[60vh]" : "min-h-0 flex-1")}>
                  {!isDesktop && topRightExtra ? <div className="flex flex-col gap-1.5">{topRightExtra}</div> : null}
                  {!isDesktop && dateFilter ? <div className="flex flex-col gap-1.5">{dateFilter}</div> : null}
                  {filters?.map((filter) => {
                    const currentValue = activeFilters[filter.key] ?? "";
                    return (
                      <div key={filter.key} className="flex flex-col gap-1.5">
                        <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
                          {filter.label}
                        </span>
                        <Select
                          aria-label={filter.label}
                          placeholder={tCommon("filterSelect", {
                            label: filter.label,
                          })}
                          value={currentValue || FILTER_ALL}
                          onChange={(key) =>
                            onFilterChange(
                              filter.key,
                              key === null || key === FILTER_ALL
                                ? ""
                                : String(key),
                            )
                          }
                        >
                          <Select.Trigger className="h-9">
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              {[
                                { value: FILTER_ALL, label: tCommon("all") },
                                ...filter.options,
                              ].map((option) => (
                                <ListBox.Item
                                  key={option.value}
                                  id={option.value}
                                  textValue={option.label}
                                >
                                  <Label>{option.label}</Label>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    );
                  })}

                  {filterExtra ? (
                    <div className="pt-2 border-t border-ink-200/60 flex flex-col gap-2">
                      {filterExtra}
                    </div>
                  ) : null}
                </div>

                {/* Popover Footer */}
                <div className="px-4 py-2.5 bg-ink-50/50 border-t border-ink-200/80 flex items-center justify-between">
                  <span className="text-xs text-ink-400 font-medium">
                    {activeFilterCount > 0
                      ? tTable("activeFilters", { count: activeFilterCount })
                      : tCommon("noFilter")}
                  </span>
                  <Button
                    size="sm"
                    onPress={() => setIsFilterOpen(false)}
                    className="h-8 px-4 text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-lg shadow-xs transition-colors"
                  >
                    {tTable("done")}
                  </Button>
                </div>
              </>
  );

  const hasFilterOptions =
    Boolean(filters && filters.length > 0) || Boolean(filterExtra);

  // Mobil: arama tam genişlik; filtreler, tarih ve ek seçiciler alttan açılan çekmecede (bottom sheet).
  if (!isDesktop) {
    const showFilters = hasFilterOptions || Boolean(dateFilter) || Boolean(topRightExtra);
    return (
      <div className="flex flex-col gap-2.5">
      <div className="w-full">
          <SearchField
            value={searchDraft}
            onChange={onSearchDraftChange}
            aria-label={tTable("searchLabel")}
            className="w-full"
          >
            <SearchField.Group className="h-9">
              <SearchField.SearchIcon />
              <SearchField.Input
                id="dt-search-input"
                placeholder={searchPlaceholder ?? tTable("searchPlaceholder")}
              />

              <SearchField.ClearButton aria-label={tCommon("clear")} />
            </SearchField.Group>
          </SearchField>
        </div>
        <div className="flex items-center gap-2">
          {showFilters ? (
            <Drawer isOpen={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <Button
                id="dt-filters-trigger"
                onPress={() => setIsFilterOpen(true)}
                size="sm"
                variant={activeFilterCount > 0 || hasActiveDate ? "secondary" : "outline"}
                className={cn(
                  "h-9 px-3 text-sm font-medium transition-all shadow-xs border rounded-xl",
                  activeFilterCount > 0
                    ? "bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/40 font-semibold"
                    : "border-ink-200/80 bg-ink-100/60 hover:bg-ink-100 text-ink-700",
                )}
              >
                <SlidersHorizontal
                  className="h-4 w-4 shrink-0 text-ink-500"
                  aria-hidden
                />
                <span>{tTable("filters")}</span>
                {activeFilterCount > 0 ? (
                  <span className="rounded-md bg-accent px-1.5 text-[11px] text-accent-foreground">
                    {activeFilterCount}
                  </span>
                ) : (
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-ink-400 transition-transform",
                      isFilterOpen && "rotate-180",
                    )}
                    aria-hidden
                  />
                )}
              </Button>
              <Drawer.Backdrop>
                <Drawer.Content placement="bottom">
                  <Drawer.Dialog aria-label={tTable("filters")} className={cn(BOTTOM_SHEET_CLASS, "p-0")}>
                    <SheetHandle />
                    <DialogDismissButton drawer />
                    {filterPanel}
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer>
          ) : null}
          {hasAnyActive ? (
          <Button
            id="dt-clear-all"
            size="sm"
            variant="danger-soft"
            className="h-9 px-2.5 text-sm font-medium text-ink-500 hover:text-danger hover:bg-danger-50/60 rounded-xl transition-colors"
            onPress={handleResetAll}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {tCommon("clear")}
          </Button>
        ) : null}
          <div className="ml-auto flex items-center gap-2">{toolbarExtra}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Sol Küme: Arama Inputu + Tarih Filtresi + Sağına Temizle Butonu */}
      <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
        <div className="w-full sm:w-64 md:w-72">
          <SearchField
            value={searchDraft}
            onChange={onSearchDraftChange}
            aria-label={tTable("searchLabel")}
            className="w-full"
          >
            <SearchField.Group className="h-9">
              <SearchField.SearchIcon />
              <SearchField.Input
                id="dt-search-input"
                placeholder={searchPlaceholder ?? tTable("searchPlaceholder")}
              />

              <SearchField.ClearButton aria-label={tCommon("clear")} />
            </SearchField.Group>
          </SearchField>
        </div>

        {dateFilter}

        {hasAnyActive ? (
          <Button
            id="dt-clear-all"
            size="sm"
            variant="danger-soft"
            className="h-9 px-2.5 text-sm font-medium text-ink-500 hover:text-danger hover:bg-danger-50/60 rounded-xl transition-colors"
            onPress={handleResetAll}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            {tCommon("clear")}
          </Button>
        ) : null}
      </div>

      {/* Sağ Küme: Gelen/Giden Filtresi (topRightExtra) + Sağ Tarafına Filtreler Menüsü */}
      <div className="flex flex-wrap items-center gap-2.5 ml-auto">
        {topRightExtra}

        {hasFilterOptions ? (
          <Popover isOpen={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <Button
              id="dt-filters-trigger"
              size="sm"
              variant={activeFilterCount > 0 ? "secondary" : "outline"}
              className={cn(
                "h-9 px-3 text-sm font-medium transition-all shadow-xs border rounded-xl",
                activeFilterCount > 0
                  ? "bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/40 font-semibold"
                  : "border-ink-200/80 bg-ink-100/60 hover:bg-ink-100 text-ink-700",
              )}
            >
              <SlidersHorizontal
                className="h-4 w-4 shrink-0 text-ink-500"
                aria-hidden
              />
              <span>{tTable("filters")}</span>
              {activeFilterCount > 0 ? (
                <span className="rounded-md bg-accent px-1.5 text-[11px] text-accent-foreground">
                  {activeFilterCount}
                </span>
              ) : (
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-ink-400 transition-transform",
                    isFilterOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              )}
            </Button>

            <Popover.Content
              placement="bottom end"
              offset={8}
              className="p-0 border border-ink-200/80 shadow-2xl rounded-2xl bg-surface overflow-hidden w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)]"
            >
              <Popover.Dialog
                aria-label={tTable("filters")}
                className="flex flex-col p-0"
              >
                {filterPanel}
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
        ) : null}

        {toolbarExtra}
      </div>
    </div>
  );
}
