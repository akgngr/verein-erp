"use client";

import { Pagination } from "@heroui/react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("common");

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-small text-default-500">
        {t("totalRecords", { count: total })}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="relative inline-flex items-center">
          <select
            className="h-8 w-[125px] appearance-none rounded-medium border border-default-200/80 bg-default-100/70 px-3 pr-8 text-tiny font-medium text-default-700 outline-none hover:bg-default-200/60 focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer select-none"
            aria-label={t("recordsPerPage")}
            value={String(pageSize)}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {t("recordsPerPageValue", { count: size })}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-default-400"
            aria-hidden="true"
          />
        </div>
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
