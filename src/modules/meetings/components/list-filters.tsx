"use client";

import { DatePicker } from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { useSearchParams } from "next/navigation";

import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";

/**
 * Toplantı listesi tarih aralığı filtreleri (7.1): filter.from / filter.to
 * meetingDate üzerinde çalışır (tür/durum DataTable filtre menüsündedir —
 * documents ListFilters kalıbı).
 */
export function MeetingListFilters() {
  const { setParams } = useListQueryState();
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
        label="Toplantı tarihi (başlangıç)"
        classNames={{ base: "w-full sm:max-w-[200px]" }}
        granularity="day"
        value={parse(from)}
        onChange={(value) =>
          setParams({ "filter.from": value ? value.toString() : null }, { resetPage: true })
        }
        hideTimeZone
      />
      <DatePicker
        label="Toplantı tarihi (bitiş)"
        classNames={{ base: "w-full sm:max-w-[200px]" }}
        granularity="day"
        value={parse(to)}
        onChange={(value) =>
          setParams({ "filter.to": value ? value.toString() : null }, { resetPage: true })
        }
        hideTimeZone
      />
    </div>
  );
}

/**
 * Görev listesi ek filtreleri (7.4): "Bana atananlar", "Süresi geçmişler" ve
 * son tarih aralığı; varsayılan görünüm yalnızca açık görevlerdir (liste
 * sorgusu filter.status yoksa OPEN uygular).
 */
export function ActionItemFilters() {
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
        label="Son tarih (başlangıç)"
        classNames={{ base: "w-full sm:max-w-[200px]" }}
        granularity="day"
        value={parse(from)}
        onChange={(value) =>
          setParams({ "filter.from": value ? value.toString() : null }, { resetPage: true })
        }
        hideTimeZone
      />
      <DatePicker
        label="Son tarih (bitiş)"
        classNames={{ base: "w-full sm:max-w-[200px]" }}
        granularity="day"
        value={parse(to)}
        onChange={(value) =>
          setParams({ "filter.to": value ? value.toString() : null }, { resetPage: true })
        }
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
        <span className={overdue ? "font-medium text-danger-600" : undefined}>
          Süresi geçmişler
        </span>
      </label>
    </div>
  );
}
