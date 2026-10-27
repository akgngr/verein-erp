"use client";

import { DatePicker } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";

/**
 * Üye listesi tarih aralığı filtresi (toolbar içine gömülür). URL state
 * üzerinden gelir; documents list-filters ile aynı kalıp.
 */
export function ListFilters() {
  const { setParams } = useListQueryState();
  const t = useTranslations("members");
  const searchParams = useSearchParams();
  const from = searchParams.get("filter.from") ?? "";
  const to = searchParams.get("filter.to") ?? "";

  const parse = (value: string) => {
    if (!value) return null;
    try {
      return parseDate(value);
    } catch {
      return null;
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <DatePicker
        label={t("listFilters.from")}
        classNames={{ base: "w-full sm:max-w-[200px]" }}
        granularity="day"
        value={parse(from)}
        onChange={(value) =>
          setParams({ "filter.from": value ? value.toString() : null }, { resetPage: true })
        }
        hideTimeZone
      />
      <DatePicker
        label={t("listFilters.to")}
        classNames={{ base: "w-full sm:max-w-[200px]" }}
        granularity="day"
        value={parse(to)}
        onChange={(value) =>
          setParams({ "filter.to": value ? value.toString() : null }, { resetPage: true })
        }
        hideTimeZone
      />
      {(from || to) && (
        <button
          type="button"
          onClick={() => setParams({ "filter.from": null, "filter.to": null }, { resetPage: true })}
          className="h-10 rounded-medium border border-default-200 px-3 text-small text-default-600 hover:bg-default-50"
        >
          {t("listFilters.clear")}
        </button>
      )}
    </div>
  );
}
