"use client";

import { Button, Dropdown, Label, Table } from "@heroui/react";
import { MoreHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Key } from "react";

import {
  applyPageSelection,
  buildQuerySnapshot,
  sameQuerySnapshot,
  selectedCount,
  selectedIdsForPage,
} from "@/shared/data-table/selection-contract";
import { cn } from "@/shared/utils";

import { DataTablePagination } from "./data-table-pagination";
import { useListQueryState } from "./use-list-query-state";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTableBulkActionBar } from "./data-table-bulk-action-bar";
import { normalizeSelectedKeys } from "./selection";
import type { DataTableProps } from "./types";
import { EmptyState } from "../ui/empty-state";

const ACTIONS_COLUMN_KEY = "_actions";

// KARAR: Satır işlemleri ("…") sütunu sağ kenara sabitlenir (sticky). Çok sütunlu tablolar
// kapsayıcıdan taştığında (yatay kaydırma) işlem menüsü her zaman görünür kalır.
const ACTIONS_STICKY_CLASS = "sticky right-0 z-10";

/**
 * Sunucu taraflı ortak DataTable (9.2): arama/sıralama/sayfalama veritabanında
 * yapılır, durum URL query parametrelerinde tutulur (paylaşılabilir görünüm).
 * Hiçbir modülü import etmez.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  total,
  page,
  pageSize,
  sort,
  dir,
  q = "",
  searchPlaceholder,
  filters,
  rowActions,
  selection,
  topRightExtra,
  dateFilter,
  filterExtra,
  toolbarExtra,
  emptyMessage,
  ariaLabel,
}: DataTableProps<T>) {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const searchParams = useSearchParams();
  const { setParams, isPending } = useListQueryState();
  const [searchDraft, setSearchDraft] = useState(q);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visibleIds = useMemo(() => rows.map((row) => row.id), [rows]);
  const querySnapshot = useMemo(
    () => buildQuerySnapshot(new URLSearchParams(searchParams.toString()), { q, sort, dir }),
    [dir, q, searchParams, sort],
  );
  const selectedPageIds = selection
    ? selectedIdsForPage(selection.value, visibleIds)
    : [];
  const currentSelectedCount = selection
    ? selectedCount(selection.value, total)
    : 0;
  const canSelectAllQuery = Boolean(
    selection?.allowQuerySelection &&
      selection.value.type === "explicit" &&
      visibleIds.length > 0 &&
      selectedPageIds.length === visibleIds.length &&
      total > visibleIds.length,
  );

  const clearExplicitSelection = useCallback(() => {
    if (selection?.value.type === "explicit" && selection.value.ids.length > 0) {
      selection.onChange({ type: "explicit", ids: [] });
    }
  }, [selection]);

  useEffect(() => {
    if (
      selection?.value.type === "query" &&
      !sameQuerySnapshot(selection.value.query, querySnapshot)
    ) {
      selection.onChange({ type: "explicit", ids: [] });
    }
  }, [querySnapshot, selection]);

  // Arama kutusu 300 ms debounce ile q'yü günceller; arama değişince sayfa 1'e döner.
  useEffect(() => {
    if (searchDraft === q) return;
    const timer = setTimeout(() => {
      clearExplicitSelection();
      setParams({ q: searchDraft }, { resetPage: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [clearExplicitSelection, searchDraft, q, setParams]);

  const handleSort = (columnKey: Key) => {
    const column = columns.find((item) => item.key === String(columnKey));
    if (!column?.sortable) return;
    clearExplicitSelection();
    if (sort !== String(columnKey) || !dir) {
      setParams({ sort: String(columnKey), dir: "asc" }, { resetPage: true });
    } else if (dir === "asc") {
      setParams({ sort: String(columnKey), dir: "desc" }, { resetPage: true });
    } else {
      setParams({ sort: null, dir: null }, { resetPage: true });
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    clearExplicitSelection();
    setParams({ [`filter.${key}`]: value }, { resetPage: true });
  };

  const handlePageChange = (nextPage: number) => {
    clearExplicitSelection();
    setParams({ page: nextPage > 1 ? String(nextPage) : null });
  };

  const handlePageSizeChange = (nextSize: number) => {
    clearExplicitSelection();
    setParams(
      { pageSize: nextSize !== 10 ? String(nextSize) : null },
      { resetPage: true },
    );
  };

  const hasRowActions = typeof rowActions === "function";
  const activeFilters = Object.fromEntries(
    (filters ?? []).map((filter) => [
      filter.key,
      searchParams.get(`filter.${filter.key}`) ?? "",
    ]),
  );

  // Not: @react-types/table kolon dizisinde null'a izin vermez; koşullu kolon
  // dizi yayma (spread) ile eklenir.
  const headerColumns = [
    ...columns.map((column, index) => (
      <Table.Column
        key={column.key}
        id={column.key}
        isRowHeader={index === 0}
        allowsSorting={Boolean(column.sortable)}
        className={cn(
          "py-3.5 text-[12px] font-medium text-ink-600",
          column.align === "end"
            ? "text-right"
            : column.align === "center"
              ? "text-center"
              : "text-left",
        )}
        width={column.width}
      >
        {({ sortDirection }) => (
          <Table.SortableColumnHeader sortDirection={sortDirection}>
            {column.label}
          </Table.SortableColumnHeader>
        )}
      </Table.Column>
    )),
    ...(hasRowActions
      ? [
          <Table.Column
            key={ACTIONS_COLUMN_KEY}
            id={ACTIONS_COLUMN_KEY}
            width={64}
            className={`${ACTIONS_STICKY_CLASS} bg-surface-secondary text-right`}
          >
            <span className="sr-only">{tCommon("actions")}</span>
          </Table.Column>,
        ]
      : []),
  ];

  const defaultCell = (row: T, key: string) => {
    const value = (row as Record<string, unknown>)[key];
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean")
      return value ? tCommon("yes") : tCommon("no");
    if (value instanceof Date) return value.toLocaleString("tr-TR");
    return String(value);
  };

  return (
    <div className="flex flex-col gap-4">
      <DataTableToolbar
        searchDraft={searchDraft}
        onSearchDraftChange={setSearchDraft}
        searchPlaceholder={searchPlaceholder}
        filters={filters}
        activeFilters={activeFilters}
        onFilterChange={handleFilterChange}
        topRightExtra={topRightExtra}
        dateFilter={dateFilter}
        filterExtra={filterExtra}
        toolbarExtra={toolbarExtra}
      />

      {selection?.bulkActions ? (
        <DataTableBulkActionBar
          selection={selection.value}
          selectedCount={currentSelectedCount}
          actions={selection.bulkActions}
          total={total}
          canSelectAllQuery={canSelectAllQuery}
          onSelectAllQuery={() =>
            selection.onChange({
              type: "query",
              query: querySnapshot,
              excludedIds: [],
            })
          }
          onClear={() => selection.onChange({ type: "explicit", ids: [] })}
        />
      ) : null}

      <div
        className={cn(
          "overflow-x-auto transition-opacity",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        <Table className="overflow-hidden rounded-xl border border-ink-200/80 bg-surface shadow-sm">
          <Table.ScrollContainer>
            <Table.Content
              aria-label={ariaLabel ?? tCommon("table.label")}
              aria-busy={isPending}
              selectionMode={selection ? "multiple" : "none"}
              selectedKeys={selection ? new Set(selectedPageIds) : undefined}
              onSelectionChange={
                selection
                  ? (keys) =>
                      selection.onChange(
                        applyPageSelection(
                          selection.value,
                          normalizeSelectedKeys(keys, visibleIds),
                          visibleIds,
                        ),
                      )
                  : undefined
              }
              sortDescriptor={
                sort && dir
                  ? {
                      column: sort,
                      direction: dir === "asc" ? "ascending" : "descending",
                    }
                  : undefined
              }
              onSortChange={(descriptor) => handleSort(descriptor.column)}
            >
              <Table.Header>{headerColumns}</Table.Header>
              <Table.Body
                renderEmptyState={() => (
                  <EmptyState
                    title={emptyMessage ?? tCommon("noRecords")}
                    className="border-none bg-transparent"
                  />
                )}
              >
                {rows.map((row) => {
                  const actions =
                    rowActions?.(row).filter((action) => !action.hidden) ?? [];
                  const cells = [
                    ...columns.map((column) => (
                      <Table.Cell
                        key={column.key}
                        className="py-3.5 text-[13px]"
                      >
                        {column.render
                          ? column.render(row)
                          : defaultCell(row, column.key)}
                      </Table.Cell>
                    )),
                    ...(hasRowActions
                      ? [
                          <Table.Cell
                            key={ACTIONS_COLUMN_KEY}
                            className={`${ACTIONS_STICKY_CLASS} bg-surface`}
                          >
                            {actions.length > 0 ? (
                              <Dropdown>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="tertiary"
                                  aria-label={tCommon("rowActions")}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>

                                <Dropdown.Popover placement="bottom end">
                                  <Dropdown.Menu
                                    aria-label={tCommon("rowActions")}
                                  >
                                    {actions.map((action) => (
                                      <Dropdown.Item
                                        key={action.key}
                                        id={action.key}
                                        textValue={action.label}
                                        variant={
                                          action.color === "danger"
                                            ? "danger"
                                            : undefined
                                        }
                                        onAction={() => {
                                          if (action.href) {
                                            router.push(action.href);
                                            return;
                                          }
                                          action.onPress?.();
                                        }}
                                      >
                                        {action.icon}
                                        <Label>{action.label}</Label>
                                      </Dropdown.Item>
                                    ))}
                                  </Dropdown.Menu>
                                </Dropdown.Popover>
                              </Dropdown>
                            ) : null}
                          </Table.Cell>,
                        ]
                      : []),
                  ];
                  return (
                    <Table.Row
                      key={row.id}
                      id={row.id}
                      className="erp-motion-selection border-b border-ink-100 last:border-b-0 hover:bg-ink-50 data-[selected=true]:bg-brand-50/80 dark:data-[selected=true]:bg-brand-500/10"
                    >
                      {cells}
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
