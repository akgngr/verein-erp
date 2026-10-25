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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useTransition, useState } from "react";
import type { Key } from "react";

import { cn } from "@/shared/utils";

import { DataTablePagination } from "./data-table-pagination";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchDraft, setSearchDraft] = useState(q);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const updateParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  // Arama kutusu 300 ms debounce ile q'yü günceller; arama değişince sayfa 1'e döner.
  useEffect(() => {
    if (searchDraft === q) return;
    const timer = setTimeout(() => {
      updateParams((params) => {
        params.delete("page");
        if (searchDraft) params.set("q", searchDraft);
        else params.delete("q");
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchDraft, q, updateParams]);

  const handleSort = (columnKey: Key) => {
    const column = columns.find((item) => item.key === String(columnKey));
    if (!column?.sortable) return;
    updateParams((params) => {
      params.delete("page");
      if (sort !== String(columnKey) || !dir) {
        params.set("sort", String(columnKey));
        params.set("dir", "asc");
      } else if (dir === "asc") {
        params.set("dir", "desc");
      } else {
        params.delete("sort");
        params.delete("dir");
      }
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateParams((params) => {
      params.delete("page");
      const paramKey = `filter.${key}`;
      if (value) params.set(paramKey, value);
      else params.delete(paramKey);
    });
  };

  const handlePageChange = (nextPage: number) => {
    updateParams((params) => {
      if (nextPage > 1) params.set("page", String(nextPage));
      else params.delete("page");
    });
  };

  const handlePageSizeChange = (nextSize: number) => {
    updateParams((params) => {
      params.delete("page");
      if (nextSize !== 10) params.set("pageSize", String(nextSize));
      else params.delete("pageSize");
    });
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
