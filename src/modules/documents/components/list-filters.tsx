"use client";

import { DatePicker, Tab, Tabs } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { useSearchParams } from "next/navigation";

import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";

/**
 * Yön sekmeleri (8.1): Tümü / Gelen / Giden — filter.direction parametresini günceller.
 */
export function DirectionTabs() {
  const { setParams } = useListQueryState();
  const searchParams = useSearchParams();
  const direction = searchParams.get("filter.direction") ?? "all";

  return (
    <Tabs
      aria-label="Yön filtresi"
      size="sm"
      selectedKey={direction}
      onSelectionChange={(key) =>
        setParams(
          { "filter.direction": key === "all" ? null : String(key) },
          { resetPage: true },
        )
      }
    >
      <Tab key="all" title="Tümü" />
      <Tab key="INCOMING" title="Gelen" />
      <Tab key="OUTGOING" title="Giden" />
    </Tabs>
  );
}

/**
 * Liste filtreleri (8.1): tarih aralığı (evrak tarihi), "Bana atananlar" ve
 * "Süresi geçmişler" anahtarları. URL'deki filter.from / filter.to / filter.mine /
 * filter.overdue parametrelerini useListQueryState ile günceller.
 */
export function ListFilters() {
  const { setParams } = useListQueryState();
  const searchParams = useSearchParams();

  const from = searchParams.get("filter.from") ?? "";
  const to = searchParams.get("filter.to") ?? "";
  const mine = searchParams.get("filter.mine") === "1";
  const overdue = searchParams.get("filter.overdue") === "1";

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
        label="Evrak tarihi (başlangıç)"
        classNames={{ base: "w-full sm:max-w-[200px]" }}
        granularity="day"
        value={parse(from)}
        onChange={(value) => setParams({ "filter.from": value ? value.toString() : null }, { resetPage: true })}
        hideTimeZone
      />
      <DatePicker
        label="Evrak tarihi (bitiş)"
        classNames={{ base: "w-full sm:max-w-[200px]" }}
        granularity="day"
        value={parse(to)}
        onChange={(value) => setParams({ "filter.to": value ? value.toString() : null }, { resetPage: true })}
        hideTimeZone
      />
      <label className="flex cursor-pointer select-none items-center gap-2 pb-2 text-small">
        <input
          type="checkbox"
          checked={mine}
          onChange={(event) =>
            setParams({ "filter.mine": event.target.checked ? "1" : null }, { resetPage: true })
          }
          className="h-4 w-4 accent-[hsl(var(--heroui-primary))]"
        />
        Bana atananlar
      </label>
      <label className="flex cursor-pointer select-none items-center gap-2 pb-2 text-small">
        <input
          type="checkbox"
          checked={overdue}
          onChange={(event) =>
            setParams({ "filter.overdue": event.target.checked ? "1" : null }, { resetPage: true })
          }
          className="h-4 w-4 accent-[hsl(var(--heroui-danger))]"
        />
        <span className={overdue ? "font-medium text-danger-600" : undefined}>Süresi geçmişler</span>
      </label>
    </div>
  );
}
