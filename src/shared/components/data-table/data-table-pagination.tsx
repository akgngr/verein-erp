"use client";

import { Pagination, Select, SelectItem } from "@heroui/react";

export function DataTablePagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-small text-default-500">Toplam {total} kayıt</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Select
          id="dt-pagination-page-size"
          className="w-[130px]"
          size="sm"
          aria-label="Sayfa başına kayıt"
          selectedKeys={[String(pageSize)]}
          onSelectionChange={(keys) => {
            const key = keys === "all" ? undefined : Array.from(keys)[0];
            if (key) onPageSizeChange(Number(key));
          }}
        >
          {[10, 25, 50].map((size) => (
            <SelectItem key={String(size)} textValue={`${size} kayıt`}>
              {size} kayıt
            </SelectItem>
          ))}
        </Select>
        <Pagination
          page={page}
          total={totalPages}
          onChange={onPageChange}
          showControls
          size="sm"
          isCompact
        />
      </div>
    </div>
  );
}
