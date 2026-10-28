"use client";

import { Switch } from "@heroui/react";
import { AlertCircle, UserCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { DateRangeFilter } from "@/shared/components/data-table/date-range-filter";
import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";
import { cn } from "@/shared/utils";

/**
 * Toplantı listesi tarih aralığı filtresi (7.1): filter.from / filter.to
 * meetingDate üzerinde çalışır. Alt satırın solunda yer alır.
 */
export function MeetingDateFilter() {
  return <DateRangeFilter label="Toplantı tarihi" idPrefix="meeting-date" />;
}

/** Geriye dönük uyumluluk */
export const MeetingListFilters = MeetingDateFilter;

/**
 * Görev listesi son tarih aralığı filtresi (7.4): filter.from / filter.to
 * dueDate üzerinde çalışır.
 */
export function ActionItemDateFilter() {
  return <DateRangeFilter label="Son tarih" idPrefix="action-item-date" />;
}

/**
 * Görev listesi Filtreler Popover'ı içinde gösterilecek hızlı switch filtreleri.
 */
export function ActionItemQuickFilters() {
  const { setParams } = useListQueryState();
  const searchParams = useSearchParams();

  const mine = searchParams.get("filter.mine") === "1";
  const overdue = searchParams.get("filter.overdue") === "1";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold text-default-500 uppercase tracking-wider">
        Özel Filtreler
      </span>

      {/* Bana Atananlar Switch Kartı */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setParams({ "filter.mine": mine ? null : "1" }, { resetPage: true })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setParams({ "filter.mine": mine ? null : "1" }, { resetPage: true });
          }
        }}
        className={cn(
          "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
          mine
            ? "bg-primary-50/70 border-primary-300 dark:bg-primary-500/15 dark:border-primary-500/30"
            : "bg-default-100/40 border-default-200/70 hover:bg-default-100/80",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              mine
                ? "bg-primary text-primary-foreground"
                : "bg-default-200/80 text-default-600",
            )}
          >
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-small font-medium text-foreground">Bana atananlar</span>
            <span className="text-[11px] text-default-400">
              Yalnızca size atanan açık görevler
            </span>
          </div>
        </div>
        <Switch
          id="action-item-filter-mine"
          size="sm"
          aria-label="Bana atananlar"
          isSelected={mine}
          onValueChange={(val) =>
            setParams({ "filter.mine": val ? "1" : null }, { resetPage: true })
          }
        />
      </div>

      {/* Süresi Geçmişler Switch Kartı */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setParams({ "filter.overdue": overdue ? null : "1" }, { resetPage: true })}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setParams({ "filter.overdue": overdue ? null : "1" }, { resetPage: true });
          }
        }}
        className={cn(
          "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
          overdue
            ? "bg-danger-50/70 border-danger-300 dark:bg-danger-500/15 dark:border-danger-500/30"
            : "bg-default-100/40 border-default-200/70 hover:bg-default-100/80",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              overdue
                ? "bg-danger text-danger-foreground"
                : "bg-default-200/80 text-default-600",
            )}
          >
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-small font-medium text-foreground">Süresi geçmişler</span>
            <span className="text-[11px] text-default-400">
              Son teslim tarihi geçmiş görevler
            </span>
          </div>
        </div>
        <Switch
          id="action-item-filter-overdue"
          size="sm"
          color="danger"
          aria-label="Süresi geçmişler"
          isSelected={overdue}
          onValueChange={(val) =>
            setParams({ "filter.overdue": val ? "1" : null }, { resetPage: true })
          }
        />
      </div>
    </div>
  );
}

/** Geriye dönük uyumluluk */
export const ActionItemFilters = ActionItemDateFilter;
