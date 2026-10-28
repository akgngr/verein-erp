"use client";

import {
  Badge,
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Input,
  Select,
  SelectItem,
} from "@heroui/react";
import { CalendarDays, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import type { DataTableToolbarContext } from "@/shared/components/data-table/types";
import { FILTER_ALL } from "@/shared/components/data-table/data-table-toolbar";
import { useListQueryState } from "@/shared/components/data-table/use-list-query-state";
import { formatDate } from "@/shared/utils";

import { berlinToday } from "../utils";
import { DirectionTabs } from "./list-filters";

/** Tarih aralığı hazır seçenekleri (kullanıcı talebi: tarih için dropdown buton). */
const DATE_PRESETS = [
  { key: "today", labelKey: "dateToday" },
  { key: "7d", labelKey: "date7d" },
  { key: "30d", labelKey: "date30d" },
  { key: "month", labelKey: "dateMonth" },
  { key: "lastMonth", labelKey: "dateLastMonth" },
  { key: "year", labelKey: "dateYear" },
] as const;

const CLEAR_KEY = "__clear__";

/**
 * Hazır tarih aralığını "YYYY-MM-DD" çifti olarak üretir.
 * KARAR: Modülün tarih-only KARAR'ına uyum için hesap Europe/Berlin takvimine
 * göre yapılır (berlinToday; sorgu tarafı UTC gece yarısı ile aynı evrene oturur).
 */
function presetRange(key: string): { from: string; to: string } | null {
  const today = berlinToday();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const d = today.getUTCDate();

  switch (key) {
    case "today":
      return { from: iso(today), to: iso(today) };
    case "7d": {
      const from = new Date(today);
      from.setUTCDate(d - 6);
      return { from: iso(from), to: iso(today) };
    }
    case "30d": {
      const from = new Date(today);
      from.setUTCDate(d - 29);
      return { from: iso(from), to: iso(today) };
    }
    case "month":
      return {
        from: iso(new Date(Date.UTC(y, m, 1))),
        to: iso(new Date(Date.UTC(y, m + 1, 0))),
      };
    case "lastMonth":
      return {
        from: iso(new Date(Date.UTC(y, m - 1, 1))),
        to: iso(new Date(Date.UTC(y, m, 0))),
      };
    case "year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    default:
      return null;
  }
}

/**
 * Evrak listesi özel toolbar — COMPACT (kullanıcı talebi: "boş kalabalık olmasın"):
 * Tek satır (lg+): arama (büyür) + yön sekmeleri + tarih butonu + Filtreler butonu + Temizle.
 * Durum/Kategori/Sorumlu ve anahtarlar "Filtreler" açılır paneline taşındı; panelde
 * etkin filtre sayısı buton üzerinde rozetle görünür. Panel dış tıkla/Escape ile kapanır.
 *
 * KARAR: Filtre değerleri doğrudan URL'den okunup useListQueryState ile yazılır;
 * DataTable'ın activeFilters mekanizmasına ihtiyaç duyulmaz. Arama debounce durumu
 * renderToolbar bağlamından gelir — çift state üretilmez.
 */
export function DocumentToolbar({
  ctx,
  statusOptions,
  categoryOptions,
  assigneeOptions,
}: {
  ctx: DataTableToolbarContext;
  statusOptions: { value: string; label: string }[];
  categoryOptions: { value: string; label: string }[];
  assigneeOptions: { value: string; label: string }[];
}) {
  const { setParams } = useListQueryState();
  const t = useTranslations("documents");
  const searchParams = useSearchParams();

  const from = searchParams.get("filter.from") ?? "";
  const to = searchParams.get("filter.to") ?? "";
  const status = searchParams.get("filter.status") ?? "";
  const categoryId = searchParams.get("filter.categoryId") ?? "";
  const assigneeId = searchParams.get("filter.assigneeId") ?? "";
  const mine = searchParams.get("filter.mine") === "1";
  const overdue = searchParams.get("filter.overdue") === "1";
  const direction = searchParams.get("filter.direction") ?? "";

  const hasDateFilter = Boolean(from || to);
  const activeFilterCount =
    (status ? 1 : 0) + (categoryId ? 1 : 0) + (assigneeId ? 1 : 0) + (mine ? 1 : 0) + (overdue ? 1 : 0);
  const hasFilters = hasDateFilter || activeFilterCount > 0 || direction !== "";

  // KARAR: açılır filtre paneli custom div — react-aria overlay'leri iç içe
  // (Dropdown içinde Select) kullanmak yerine dış tıkla/Escape kapanışı elle
  // yönetilir; panel içindeki HeroUI Select'ler kendi popover'larıyla sorunsuz açılır.
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panelOpen]);

  const dateLabel = hasDateFilter
    ? `${from ? formatDate(from) : "…"} – ${to ? formatDate(to) : "…"}`
    : t("filter.dateRange");

  const applyDateRange = (range: { from: string; to: string } | null) => {
    setParams(
      { "filter.from": range?.from ?? null, "filter.to": range?.to ?? null },
      { resetPage: true },
    );
  };

  const clearFilters = () => {
    setParams(
      {
        "filter.from": null,
        "filter.to": null,
        "filter.status": null,
        "filter.categoryId": null,
        "filter.assigneeId": null,
        "filter.mine": null,
        "filter.overdue": null,
        "filter.direction": null,
      },
      { resetPage: true },
    );
  };

  // Panel içindeki compact Select: label yok (yer kazancı), aria + placeholder.
  const renderSelect = (
    key: "status" | "categoryId" | "assigneeId",
    label: string,
    value: string,
    options: { value: string; label: string }[],
  ) => (
    <Select
      className="w-full"
      size="sm"
      aria-label={label}
      placeholder={label}
      selectedKeys={value ? [value] : [FILTER_ALL]}
      onSelectionChange={(keys) => {
        const selected = keys === "all" ? undefined : Array.from(keys)[0];
        const next = selected === undefined || selected === FILTER_ALL ? "" : String(selected);
        setParams({ [`filter.${key}`]: next }, { resetPage: true });
      }}
    >
      {[{ value: FILTER_ALL, label: t("filter.all") }, ...options].map((option) => (
        <SelectItem key={option.value} textValue={option.label}>
          {option.label}
        </SelectItem>
      ))}
    </Select>
  );

  const dateMenu = (
    <Dropdown placement="bottom-start">
      <DropdownTrigger>
        <Button
          id={`${ctx.idPrefix}-date-range`}
          size="sm"
          variant={hasDateFilter ? "flat" : "bordered"}
          color={hasDateFilter ? "primary" : "default"}
          startContent={<CalendarDays className="h-4 w-4" aria-hidden />}
          endContent={<ChevronDown className="h-3.5 w-3.5" aria-hidden />}
          className="max-w-[240px]"
        >
          <span className="truncate">{dateLabel}</span>
        </Button>
      </DropdownTrigger>
      {/* KARAR: react-aria koleksiyon tipleri tek dizi çocuğu beklediği için
          hazır seçenekler + temizle tek dizide verilir (DataTable actions kalıbı). */}
      <DropdownMenu
        aria-label={t("filter.dateAria")}
        onAction={(key) => {
          if (key === CLEAR_KEY) applyDateRange(null);
          else applyDateRange(presetRange(String(key)));
        }}
      >
        {[
          ...DATE_PRESETS.map((preset) => (
            <DropdownItem key={preset.key}>{t(`filter.${preset.labelKey}`)}</DropdownItem>
          )),
          <DropdownItem
            key={CLEAR_KEY}
            showDivider
            color="danger"
            isDisabled={!hasDateFilter}
          >
            {t("filter.dateClear")}
          </DropdownItem>,
        ]}
      </DropdownMenu>
    </Dropdown>
  );

  const filterPanelButton = (
    <div ref={panelRef} className="relative">
      <Badge
        content={String(activeFilterCount)}
        color="primary"
        size="sm"
        shape="circle"
        isInvisible={activeFilterCount === 0}
      >
        <Button
          id={`${ctx.idPrefix}-filters`}
          size="sm"
          variant={activeFilterCount > 0 ? "flat" : "bordered"}
          color={activeFilterCount > 0 ? "primary" : "default"}
          startContent={<SlidersHorizontal className="h-4 w-4" aria-hidden />}
          endContent={<ChevronDown className="h-3.5 w-3.5" aria-hidden />}
          aria-expanded={panelOpen}
          aria-haspopup="dialog"
          onPress={() => setPanelOpen((open) => !open)}
        >
          {t("filter.filters")}
        </Button>
      </Badge>
      {panelOpen ? (
        <div
          role="dialog"
          aria-label={t("filter.filtersAria")}
          className="absolute right-0 top-full z-30 mt-2 flex w-72 flex-col gap-3 rounded-medium border border-default-200 bg-content1 p-3 shadow-medium"
        >
          {renderSelect("status", t("filter.status"), status, statusOptions)}
          {renderSelect("categoryId", t("filter.category"), categoryId, categoryOptions)}
          {renderSelect("assigneeId", t("filter.assignee"), assigneeId, assigneeOptions)}
          <label className="flex cursor-pointer select-none items-center gap-2 text-small">
            <input
              type="checkbox"
              checked={mine}
              onChange={(event) =>
                setParams(
                  { "filter.mine": event.target.checked ? "1" : null },
                  { resetPage: true },
                )
              }
              className="h-4 w-4 accent-[hsl(var(--heroui-primary))]"
            />
            {t("filter.mine")}
          </label>
          <label className="flex cursor-pointer select-none items-center gap-2 text-small">
            <input
              type="checkbox"
              checked={overdue}
              onChange={(event) =>
                setParams(
                  { "filter.overdue": event.target.checked ? "1" : null },
                  { resetPage: true },
                )
              }
              className="h-4 w-4 accent-[hsl(var(--heroui-danger))]"
            />
            <span className={overdue ? "font-medium text-danger-600" : undefined}>
              {t("filter.overdue")}
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        id={`${ctx.idPrefix}-search`}
        className="w-full min-w-[200px] flex-1 sm:max-w-sm"
        size="sm"
        value={ctx.searchDraft}
        onValueChange={ctx.onSearchDraftChange}
        onClear={() => ctx.onSearchDraftChange("")}
        isClearable
        placeholder={t("filter.search")}
        startContent={<Search className="h-4 w-4 text-default-400" aria-hidden />}
        aria-label={t("filter.searchAria")}
      />

      <DirectionTabs />

      {dateMenu}
      {filterPanelButton}

      {hasFilters ? (
        <Button
          size="sm"
          variant="light"
          isIconOnly
          aria-label={t("filter.clear")}
          title={t("filter.clear")}
          startContent={<X className="h-4 w-4" aria-hidden />}
          onPress={clearFilters}
        />
      ) : null}
    </div>
  );
}
