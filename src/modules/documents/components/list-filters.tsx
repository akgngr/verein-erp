"use client";

import { Switch, Tab, Tabs } from "@heroui/react";
import { AlertCircle, UserCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { DateRangeFilter } from "@/shared/components/data-table/date-range-filter";
import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";
import { cn } from "@/shared/utils";

/**
 * Yön sekmeleri (8.1): Tümü / Gelen / Giden — filter.direction parametresini günceller.
 * Tablo üst satırının sağında yer alır.
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
      classNames={{
        tabList: "bg-default-100/70 border border-default-200/80 h-9 p-0.5 rounded-xl",
        cursor: "bg-background shadow-xs rounded-lg",
        tab: "h-7 text-small font-medium px-3",
      }}
    >
      <Tab key="all" title="Tümü" />
      <Tab key="INCOMING" title="Gelen" />
      <Tab key="OUTGOING" title="Giden" />
    </Tabs>
  );
}

/**
 * Evrak kayıt tarihi filtresi (8.1): Popover tarih aralığı seçici.
 * Tablo alt satırının en solunda yer alır.
 */
export function DocumentDateFilter() {
  return <DateRangeFilter label="Kayıt Tarihi" idPrefix="doc-date" />;
}

/**
 * Filtreler Popover'ı içinde gösterilecek hızlı switch filtreleri (Bana atananlar ve Süresi geçmişler).
 */
export function DocumentQuickFilters() {
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
              Yalnızca sizin sorumlu olduğunuz evraklar
            </span>
          </div>
        </div>
        <Switch
          id="doc-filter-mine"
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
              İşlem süresi veya vadesi dolmuş kayıtlar
            </span>
          </div>
        </div>
        <Switch
          id="doc-filter-overdue"
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

/** Geriye dönük uyumluluk için ListFilters */
export function ListFilters() {
  return <DocumentDateFilter />;
}
