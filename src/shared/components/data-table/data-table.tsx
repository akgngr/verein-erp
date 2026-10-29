"use client";

import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { MoreHorizontal } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Key } from "react";

import { cn } from "@/shared/utils";

import { DataTablePagination } from "./data-table-pagination";
import { useListQueryState } from "./use-list-query-state";
import { DataTableToolbar } from "./data-table-toolbar";
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

  // Arama kutusu 300 ms debounce ile q'yü günceller; arama değişince sayfa 1'e döner.
  useEffect(() => {
    if (searchDraft === q) return;
    const timer = setTimeout(() => {
      setParams({ q: searchDraft }, { resetPage: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft, q, setParams]);

  const handleSort = (columnKey: Key) => {
    const column = columns.find((item) => item.key === String(columnKey));
    if (!column?.sortable) return;
    if (sort !== String(columnKey) || !dir) {
      setParams({ sort: String(columnKey), dir: "asc" }, { resetPage: true });
    } else if (dir === "asc") {
      setParams({ sort: String(columnKey), dir: "desc" }, { resetPage: true });
    } else {
      setParams({ sort: null, dir: null }, { resetPage: true });
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setParams({ [`filter.${key}`]: value }, { resetPage: true });
  };

  const handlePageChange = (nextPage: number) => {
    setParams({ page: nextPage > 1 ? String(nextPage) : null });
  };

  const handlePageSizeChange = (nextSize: number) => {
    setParams({ pageSize: nextSize !== 10 ? String(nextSize) : null }, { resetPage: true });
  };

  const hasRowActions = typeof rowActions === "function";
  const activeFilters = Object.fromEntries(
    (filters ?? []).map((filter) => [filter.key, searchParams.get(`filter.${filter.key}`) ?? ""]),
  );

  // Not: @react-types/table kolon dizisinde null'a izin vermez; koşullu kolon
  // dizi yayma (spread) ile eklenir.
  const headerColumns = [
    ...columns.map((column) => (
      <TableColumn
        key={column.key}
        allowsSorting={Boolean(column.sortable)}
        align={column.align}
        width={column.width}
      >
        {column.label}
      </TableColumn>
    )),
    ...(hasRowActions
      ? [
          <TableColumn
            key={ACTIONS_COLUMN_KEY}
            align="end"
            width={64}
            className={`${ACTIONS_STICKY_CLASS} bg-default-100`}
          >
            <span className="sr-only">{tCommon("actions")}</span>
          </TableColumn>,
        ]
      : []),
  ];

  const defaultCell = (row: T, key: string) => {
    const value = (row as Record<string, unknown>)[key];
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? tCommon("yes") : tCommon("no");
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

      <div
        className={cn(
          "overflow-x-auto transition-opacity",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        <Table
          aria-label={ariaLabel ?? tCommon("table.label")}
          selectionMode="none"
          sortDescriptor={
            sort && dir
              ? { column: sort, direction: dir === "asc" ? "ascending" : "descending" }
              : undefined
          }
          onSortChange={(descriptor) => handleSort(descriptor.column)}
          classNames={{
            // KARAR: overflow-x-auto — sütunlar sığmadığında satır işlemleri ("…") sütunu
            // kırpılmasın; dar ekranlarda tablo yatay kaydırılır (overflow-hidden onu gizliyordu).
            wrapper: "shadow-xs border border-default-200/80 rounded-large p-0 overflow-x-auto bg-content1",
            th: "bg-default-100/70 text-default-600 font-semibold text-tiny tracking-wider uppercase py-3 border-b border-default-200/80",
            td: "py-3 text-small border-b border-default-100 last:border-b-0",
            tr: "hover:bg-default-50/70 transition-colors",
          }}
        >
          <TableHeader>{headerColumns}</TableHeader>
          <TableBody
            emptyContent={<EmptyState title={emptyMessage ?? tCommon("noRecords")} className="border-none bg-transparent" />}
            isLoading={isPending}
          >
            {rows.map((row) => {
              const actions = rowActions?.(row).filter((action) => !action.hidden) ?? [];
              const cells = [
                ...columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render ? column.render(row) : defaultCell(row, column.key)}
                  </TableCell>
                )),
                ...(hasRowActions
                  ? [
                      <TableCell key={ACTIONS_COLUMN_KEY} className={`${ACTIONS_STICKY_CLASS} bg-content1`}>
                        {actions.length > 0 ? (
                          <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                aria-label={tCommon("rowActions")}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label={tCommon("rowActions")}>
                              {actions.map((action) => (
                                <DropdownItem
                                  key={action.key}
                                  color={action.color === "danger" ? "danger" : "default"}
                                  startContent={action.icon}
                                  onPress={() => {
                                    if (action.href) {
                                      router.push(action.href);
                                      return;
                                    }
                                    action.onPress?.();
                                  }}
                                >
                                  {action.label}
                                </DropdownItem>
                              ))}
                            </DropdownMenu>
                          </Dropdown>
                        ) : null}
                      </TableCell>,
                    ]
                  : []),
              ];
              return <TableRow key={row.id}>{cells}</TableRow>;
            })}
          </TableBody>
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
