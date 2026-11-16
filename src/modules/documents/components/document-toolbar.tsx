"use client";
import {
  Button,
  Tooltip,
  TextField,
  InputGroup,
  Select,
  ListBox,
  Label,
  Dropdown,
  Badge,
} from "@heroui/react";

import { FieldClearButton } from "@/shared/components/forms/field-clear-button";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  CalendarDays,
  ChevronDown,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
    (status ? 1 : 0) +
    (categoryId ? 1 : 0) +
    (assigneeId ? 1 : 0) +
    (mine ? 1 : 0) +
    (overdue ? 1 : 0);
  const hasFilters = hasDateFilter || activeFilterCount > 0 || direction !== "";

  // KARAR: açılır filtre paneli custom div — react-aria overlay'leri iç içe
  // (Dropdown içinde Select) kullanmak yerine dış tıkla/Escape kapanışı elle
  // yönetilir; panel içindeki HeroUI Select'ler kendi popover'larıyla sorunsuz açılır.
  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
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
      id={`documents-filter-${key}`}
      className="w-full"
      aria-label={label}
      placeholder={label}
      value={value ? value : FILTER_ALL}
      onChange={(selectedValue) => {
        const keys = selectedValue === null ? undefined : String(selectedValue);
        const selected = false ? undefined : keys;
        const next =
          selected === undefined || selected === FILTER_ALL
            ? ""
            : String(selected);
        setParams({ [`filter.${key}`]: next }, { resetPage: true });
      }}
    >
      <Select.Trigger className="h-9 text-sm">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {[{ value: FILTER_ALL, label: t("filter.all") }, ...options].map(
            (option) => (
              <ListBox.Item
                key={option.value}
                id={option.value}
                textValue={option.label}
              >
                <Label>{option.label}</Label>
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ),
          )}
        </ListBox>
      </Select.Popover>
    </Select>
  );

  const dateMenu = (
    <Dropdown>
      <Button
        id={`${ctx.idPrefix}-date-range`}
        size="sm"
        className="max-w-[240px]"
        variant={actionVariant(
          hasDateFilter ? "primary" : "default",
          hasDateFilter ? "flat" : "bordered",
        )}
      >
        {<CalendarDays className="h-4 w-4" aria-hidden />}
        <span className="truncate">{dateLabel}</span>
        {<ChevronDown className="h-3.5 w-3.5" aria-hidden />}
      </Button>

      {/* KARAR: react-aria koleksiyon tipleri tek dizi çocuğu beklediği için
          hazır seçenekler + temizle tek dizide verilir (DataTable actions kalıbı). */}
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu
          aria-label={t("filter.dateAria")}
          onAction={(key) => {
            if (key === CLEAR_KEY) applyDateRange(null);
            else applyDateRange(presetRange(String(key)));
          }}
        >
          {[
            ...DATE_PRESETS.map((preset) => (
              <Dropdown.Item
                key={preset.key}
                id={preset.key}
                textValue={String(t(`filter.${preset.labelKey}`))}
              >
                <Label>{t(`filter.${preset.labelKey}`)}</Label>
              </Dropdown.Item>
            )),
            <Dropdown.Item
              key={CLEAR_KEY}
              isDisabled={!hasDateFilter}
              id={CLEAR_KEY}
              textValue={String(t("filter.dateClear"))}
              variant={"danger" === "danger" ? "danger" : undefined}
              className={["", "mt-1 border-t border-border pt-2"]
                .filter(Boolean)
                .join(" ")}
            >
              <Label>{t("filter.dateClear")}</Label>
            </Dropdown.Item>,
          ]}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );

  const filterPanelButton = (
    <div ref={panelRef} className="relative">
      <Badge.Anchor>
        <Button
          id={`${ctx.idPrefix}-filters`}
          size="sm"
          aria-expanded={panelOpen}
          aria-haspopup="dialog"
          onPress={() => setPanelOpen((open) => !open)}
          variant={actionVariant(
            activeFilterCount > 0 ? "primary" : "default",
            activeFilterCount > 0 ? "flat" : "bordered",
          )}
        >
          {<SlidersHorizontal className="h-4 w-4" aria-hidden />}
          {t("filter.filters")}
          {<ChevronDown className="h-3.5 w-3.5" aria-hidden />}
        </Button>
        {!(activeFilterCount === 0) ? (
          <Badge color="accent" size="sm">
            <Badge.Label>{String(activeFilterCount)}</Badge.Label>
          </Badge>
        ) : null}
      </Badge.Anchor>
      {panelOpen ? (
        <div
          role="dialog"
          aria-label={t("filter.filtersAria")}
          className="absolute right-0 top-full z-30 mt-2 flex w-72 flex-col gap-3 rounded-lg border border-ink-200 bg-surface p-3 shadow-md"
        >
          {renderSelect("status", t("filter.status"), status, statusOptions)}
          {renderSelect(
            "categoryId",
            t("filter.category"),
            categoryId,
            categoryOptions,
          )}
          {renderSelect(
            "assigneeId",
            t("filter.assignee"),
            assigneeId,
            assigneeOptions,
          )}
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mine}
              onChange={(event) =>
                setParams(
                  { "filter.mine": event.target.checked ? "1" : null },
                  { resetPage: true },
                )
              }
              className="h-4 w-4 accent-[var(--accent)]"
            />
            {t("filter.mine")}
          </label>
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={overdue}
              onChange={(event) =>
                setParams(
                  { "filter.overdue": event.target.checked ? "1" : null },
                  { resetPage: true },
                )
              }
              className="h-4 w-4 accent-[var(--danger)]"
            />
            <span
              className={overdue ? "font-medium text-danger-600" : undefined}
            >
              {t("filter.overdue")}
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <TextField
        id={`${ctx.idPrefix}-search`}
        value={ctx.searchDraft}
        aria-label={t("filter.searchAria")}
        onChange={ctx.onSearchDraftChange}
        className={["w-full min-w-[200px] flex-1 sm:max-w-sm"]
          .filter(Boolean)
          .join(" ")}
      >
        <InputGroup>
          <InputGroup.Prefix>
            {<Search className="h-4 w-4 text-ink-400" aria-hidden />}
          </InputGroup.Prefix>
          <InputGroup.Input
            placeholder={t("filter.search")}
            className={["h-9 text-sm"].filter(Boolean).join(" ")}
          />
          <InputGroup.Suffix>
            {ctx.searchDraft ? (
              <FieldClearButton onPress={() => ctx.onSearchDraftChange("")} />
            ) : null}
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>

      <DirectionTabs />

      {dateMenu}
      {filterPanelButton}

      {hasFilters ? (
        <Tooltip delay={300}>
          <Button
            size="sm"
            isIconOnly
            aria-label={t("filter.clear")}
            onPress={clearFilters}
            variant={actionVariant("default", "light")}
          >
            {<X className="h-4 w-4" aria-hidden />}
          </Button>
          <Tooltip.Content>{t("filter.clear")}</Tooltip.Content>
        </Tooltip>
      ) : null}
    </div>
  );
}
