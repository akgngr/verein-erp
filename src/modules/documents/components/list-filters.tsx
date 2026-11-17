"use client";
import { Label, Switch, Tabs } from "@/shared/components/kit";

import { AlertCircle, UserCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { DateRangeFilter } from "@/shared/components/data-table/date-range-filter";
import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";
import { cn } from "@/shared/utils";

/**
 * Yön sekmeleri (8.1): Tümü / Gelen / Giden — filter.direction parametresini günceller.
 * Tablo üst satırının sağında yer alır.
 */
export function DirectionTabs() {
  const t = useTranslations("documents.filter");
  const { setParams } = useListQueryState();
  const searchParams = useSearchParams();
  const direction = searchParams.get("filter.direction") ?? "all";

  return (
    <Tabs
      selectedKey={direction}
      onSelectionChange={(key) =>
        setParams(
          { "filter.direction": key === "all" ? null : String(key) },
          { resetPage: true },
        )
      }
      emphasis="secondary"
    >
        <Tabs.List
          aria-label={t("directionAria")}
          className={
            "bg-ink-100/70 border border-ink-200/80 h-9 p-0.5 rounded-xl"
          }
        >
          <Tabs.Tab
            id={"all"}
            key={"all"}
            className={"h-7 text-sm font-medium px-3"}
          >
            {t("all")}
          </Tabs.Tab>
          <Tabs.Tab
            id={"INCOMING"}
            key={"INCOMING"}
            className={"h-7 text-sm font-medium px-3"}
          >
            {t("incoming")}
          </Tabs.Tab>
          <Tabs.Tab
            id={"OUTGOING"}
            key={"OUTGOING"}
            className={"h-7 text-sm font-medium px-3"}
          >
            {t("outgoing")}
          </Tabs.Tab>
        </Tabs.List>
    </Tabs>
  );
}

/**
 * Evrak kayıt tarihi filtresi (8.1): Popover tarih aralığı seçici.
 * Tablo alt satırının en solunda yer alır.
 */
export function DocumentDateFilter() {
  const t = useTranslations("documents.filter");
  return <DateRangeFilter label={t("dateRange")} idPrefix="doc-date" />;
}

/**
 * Filtreler Popover'ı içinde gösterilecek hızlı switch filtreleri (Bana atananlar ve Süresi geçmişler).
 */
export function DocumentQuickFilters() {
  const t = useTranslations("documents.filter");
  const { setParams } = useListQueryState();
  const searchParams = useSearchParams();

  const mine = searchParams.get("filter.mine") === "1";
  const overdue = searchParams.get("filter.overdue") === "1";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold text-ink-500 uppercase tracking-wider">
        {t("filters")}
      </span>

      {/* Bana Atananlar Switch Kartı */}
      <div
        role="button"
        tabIndex={0}
        onClick={() =>
          setParams({ "filter.mine": mine ? null : "1" }, { resetPage: true })
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setParams(
              { "filter.mine": mine ? null : "1" },
              { resetPage: true },
            );
          }
        }}
        className={cn(
          "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
          mine
            ? "bg-brand-50/70 border-brand-300 dark:bg-brand-500/15 dark:border-brand-500/30"
            : "bg-ink-100/40 border-ink-200/70 hover:bg-ink-100/80",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              mine
                ? "bg-accent text-accent-foreground"
                : "bg-ink-200/80 text-ink-600",
            )}
          >
            <UserCheck className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium text-foreground">
              {t("mine")}
            </span>
          </div>
        </div>
        <Switch
          id="doc-filter-mine"
          aria-label={t("mine")}
          isSelected={mine}
          onChange={(val) =>
            setParams({ "filter.mine": val ? "1" : null }, { resetPage: true })
          }
          size={"sm"}
        >
            <Label></Label>
        </Switch>
      </div>

      {/* Süresi Geçmişler Switch Kartı */}
      <div
        role="button"
        tabIndex={0}
        onClick={() =>
          setParams(
            { "filter.overdue": overdue ? null : "1" },
            { resetPage: true },
          )
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            setParams(
              { "filter.overdue": overdue ? null : "1" },
              { resetPage: true },
            );
          }
        }}
        className={cn(
          "flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer",
          overdue
            ? "bg-danger-50/70 border-danger-300 dark:bg-danger-500/15 dark:border-danger-500/30"
            : "bg-ink-100/40 border-ink-200/70 hover:bg-ink-100/80",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
              overdue
                ? "bg-danger text-danger-foreground"
                : "bg-ink-200/80 text-ink-600",
            )}
          >
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-sm font-medium text-foreground">
              {t("overdue")}
            </span>
          </div>
        </div>
        <Switch
          id="doc-filter-overdue"
          aria-label={t("overdue")}
          isSelected={overdue}
          onChange={(val) =>
            setParams(
              { "filter.overdue": val ? "1" : null },
              { resetPage: true },
            )
          }
          size={"sm"}
        >
            <Label></Label>
        </Switch>
      </div>
    </div>
  );
}
