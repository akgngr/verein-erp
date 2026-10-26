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
import { useEffect, useState } from "react";
import type { Key } from "react";

import { cn } from "@/shared/utils";

import { DataTablePagination } from "./data-table-pagination";
import { useListQueryState } from "./use-list-query-state";
import { DataTableToolbar } from "./data-table-toolbar";
import type { DataTableProps } from "./types";
import { EmptyState } from "../ui/empty-state";

const ACTIONS_COLUMN_KEY = "_actions";

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
  toolbarExtra,
  emptyMessage = "Kayıt bulunamadı.",
  ariaLabel = "Tablo",
}: DataTableProps<T>) {
  const router = useRouter();
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
          <TableColumn key={ACTIONS_COLUMN_KEY} align="end" width={64}>
            <span className="sr-only">İşlemler</span>
          </TableColumn>,
        ]
      : []),
  ];

  const defaultCell = (row: T, key: string) => {
    const value = (row as Record<string, unknown>)[key];
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? "Evet" : "Hayır";
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
        toolbarExtra={toolbarExtra}
      />

      <div
        className={cn(
          "overflow-x-auto transition-opacity",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        <Table
          aria-label={ariaLabel}
          selectionMode="none"
          sortDescriptor={
            sort && dir
              ? { column: sort, direction: dir === "asc" ? "ascending" : "descending" }
              : undefined
          }
          onSortChange={(descriptor) => handleSort(descriptor.column)}
        >
          <TableHeader>{headerColumns}</TableHeader>
          <TableBody
            emptyContent={<EmptyState title={emptyMessage} className="border-none bg-transparent" />}
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
                      <TableCell key={ACTIONS_COLUMN_KEY}>
                        {actions.length > 0 ? (
                          <Dropdown placement="bottom-end">
                            <DropdownTrigger>
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                aria-label="Satır işlemleri"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownTrigger>
                            <DropdownMenu aria-label="Satır işlemleri">
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
