"use client";
import { Button, Tooltip } from "@heroui/react";

import { actionVariant } from "@/shared/components/ui/action-appearance";

import { Popover, RangeCalendar } from "@heroui/react";
type RangeValue<T> = { start: T; end: T };
import { parseDate, type DateValue } from "@internationalized/date";
import { CalendarDays, ChevronDown, Globe, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/shared/utils";
import { useListQueryState } from "./use-list-query-state";

type PresetKey =
  "custom" | "today" | "yesterday" | "7d" | "14d" | "30d" | "90d" | "365d";

interface PresetItem {
  key: PresetKey;
  /** common.dateRange altındaki çeviri anahtarı. */
  labelKey: string;
  getRange: () => { from: string; to: string };
}

function getBerlinToday(): Date {
  const now = new Date();
  const s = now.toLocaleString("en-US", { timeZone: "Europe/Berlin" });
  const b = new Date(s);
  return new Date(Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()));
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const res = new Date(d);
  res.setUTCDate(res.getUTCDate() + n);
  return res;
}

const PRESETS_GROUP_1: PresetItem[] = [
  {
    key: "today",
    labelKey: "today",
    getRange: () => {
      const today = getBerlinToday();
      const iso = toISODate(today);
      return { from: iso, to: iso };
    },
  },
  {
    key: "yesterday",
    labelKey: "yesterday",
    getRange: () => {
      const today = getBerlinToday();
      const yesterday = toISODate(addDays(today, -1));
      return { from: yesterday, to: yesterday };
    },
  },
];

const PRESETS_GROUP_2: PresetItem[] = [
  {
    key: "7d",
    labelKey: "last7",
    getRange: () => {
      const today = getBerlinToday();
      return { from: toISODate(addDays(today, -6)), to: toISODate(today) };
    },
  },
  {
    key: "14d",
    labelKey: "last14",
    getRange: () => {
      const today = getBerlinToday();
      return { from: toISODate(addDays(today, -13)), to: toISODate(today) };
    },
  },
  {
    key: "30d",
    labelKey: "last30",
    getRange: () => {
      const today = getBerlinToday();
      return { from: toISODate(addDays(today, -29)), to: toISODate(today) };
    },
  },
  {
    key: "90d",
    labelKey: "last90",
    getRange: () => {
      const today = getBerlinToday();
      return { from: toISODate(addDays(today, -89)), to: toISODate(today) };
    },
  },
  {
    key: "365d",
    labelKey: "last365",
    getRange: () => {
      const today = getBerlinToday();
      return { from: toISODate(addDays(today, -364)), to: toISODate(today) };
    },
  },
];

const ALL_PRESETS = [...PRESETS_GROUP_1, ...PRESETS_GROUP_2];

function formatDisplayDate(
  dateStr: string,
  format: "short" | "full" = "short",
  locale = "tr",
): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("-").map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "tr-TR", {
      ...(format === "full" ? { year: "numeric" as const } : {}),
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(d);
  } catch {
    return dateStr;
  }
}

function parseSafeDate(dateStr: string): DateValue | null {
  if (!dateStr) return null;
  try {
    return parseDate(dateStr);
  } catch {
    return null;
  }
}

function getInitialRange(
  activeFrom: string,
  activeTo: string,
): RangeValue<DateValue> | null {
  const start = parseSafeDate(activeFrom);
  const end = parseSafeDate(activeTo);
  if (start && end) {
    return { start, end };
  }
  return null;
}

function getInitialPreset(activeFrom: string, activeTo: string): PresetKey {
  if (!activeFrom || !activeTo) return "custom";
  const matched = ALL_PRESETS.find((p) => {
    const r = p.getRange();
    return r.from === activeFrom && r.to === activeTo;
  });
  return matched ? matched.key : "custom";
}

export function DateRangeFilter({
  label,
  fromParam = "filter.from",
  toParam = "filter.to",
  idPrefix = "dt-date",
}: {
  label?: string;
  fromParam?: string;
  toParam?: string;
  idPrefix?: string;
}) {
  const { setParams } = useListQueryState();
  const searchParams = useSearchParams();
  const t = useTranslations("common.dateRange");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const fmt = (dateStr: string, format: "short" | "full" = "short") =>
    formatDisplayDate(dateStr, format, locale);

  const activeFrom = searchParams.get(fromParam) ?? "";
  const activeTo = searchParams.get(toParam) ?? "";
  const hasActiveRange = Boolean(activeFrom || activeTo);

  const [isOpen, setIsOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(() =>
    getInitialPreset(activeFrom, activeTo),
  );
  const [tempRange, setTempRange] = useState<RangeValue<DateValue> | null>(() =>
    getInitialRange(activeFrom, activeTo),
  );

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setTempRange(getInitialRange(activeFrom, activeTo));
      setSelectedPreset(getInitialPreset(activeFrom, activeTo));
    }
    setIsOpen(open);
  };

  // Hazır şablon tıklandığında
  const handleSelectPreset = (preset: PresetItem) => {
    setSelectedPreset(preset.key);
    const range = preset.getRange();
    const start = parseSafeDate(range.from);
    const end = parseSafeDate(range.to);
    if (start && end) {
      setTempRange({ start, end });
    }
  };

  // Takvimden serbest seçim yapıldığında
  const handleCalendarChange = (val: RangeValue<DateValue>) => {
    setSelectedPreset("custom");
    setTempRange(val);
  };

  // Uygula tıklandığında
  const handleApply = () => {
    if (tempRange?.start && tempRange?.end) {
      setParams(
        {
          [fromParam]: tempRange.start.toString(),
          [toParam]: tempRange.end.toString(),
        },
        { resetPage: true },
      );
    } else if (tempRange?.start) {
      setParams(
        {
          [fromParam]: tempRange.start.toString(),
          [toParam]: tempRange.start.toString(),
        },
        { resetPage: true },
      );
    }
    setIsOpen(false);
  };

  // Temizle tıklandığında
  const handleClear = () => {
    setParams(
      {
        [fromParam]: null,
        [toParam]: null,
      },
      { resetPage: true },
    );
    setTempRange(null);
    setSelectedPreset("custom");
    setIsOpen(false);
  };

  const todayIso = toISODate(getBerlinToday());

  // Tetikleyici butondaki metin
  let triggerText = label ?? t("label");
  if (hasActiveRange) {
    const matched = ALL_PRESETS.find((p) => {
      const r = p.getRange();
      return r.from === activeFrom && r.to === activeTo;
    });

    const isEndToday = activeTo === todayIso;
    const endDisplay = isEndToday ? t("today") : fmt(activeTo);

    if (matched) {
      if (activeFrom === activeTo) {
        triggerText = `${t(matched.labelKey)} (${fmt(activeFrom)})`;
      } else {
        triggerText = `${t(matched.labelKey)} (${fmt(activeFrom)} - ${endDisplay})`;
      }
    } else if (activeFrom && activeTo) {
      if (activeFrom === activeTo) {
        triggerText = fmt(activeFrom);
      } else {
        triggerText = `${fmt(activeFrom)} - ${endDisplay}`;
      }
    } else if (activeFrom) {
      triggerText = t("from", { date: fmt(activeFrom) });
    } else if (activeTo) {
      triggerText = t("until", { date: fmt(activeTo) });
    }
  }

  // Alt bilgi metni
  let footerDateText = t("none");
  if (tempRange?.start && tempRange?.end) {
    footerDateText = `${fmt(tempRange.start.toString(), "full")} - ${fmt(tempRange.end.toString(), "full")}`;
  } else if (tempRange?.start) {
    footerDateText = `${fmt(tempRange.start.toString(), "full")} - …`;
  }

  const renderPresetButton = (preset: PresetItem) => {
    const isSelected = selectedPreset === preset.key;
    return (
      <button
        key={preset.key}
        type="button"
        onClick={() => handleSelectPreset(preset)}
        className={cn(
          "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors",
          isSelected
            ? "bg-ink-200/80 font-medium text-foreground shadow-xs"
            : "text-ink-700 hover:bg-ink-100/80 hover:text-foreground",
        )}
      >
        {t(preset.labelKey)}
      </button>
    );
  };

  return (
    <div className="inline-flex items-center">
      <Popover isOpen={isOpen} onOpenChange={handleOpenChange}>
        <Button
          id={`${idPrefix}-trigger`}
          size="sm"
          className={cn(
            "h-9 px-3 text-sm font-medium transition-all shadow-xs border",
            hasActiveRange
              ? "bg-brand-50 text-brand-700 border-brand-300 dark:bg-brand-500/20 dark:text-brand-300 dark:border-brand-500/40 font-semibold"
              : "border-ink-200/80 bg-ink-100/60 hover:bg-ink-100 text-ink-600",
          )}
          variant={actionVariant(
            hasActiveRange ? "primary" : "default",
            hasActiveRange ? "flat" : "bordered",
          )}
        >
          {
            <CalendarDays
              className="h-4 w-4 shrink-0 text-ink-500"
              aria-hidden
            />
          }
          <span className="truncate max-w-[280px]">{triggerText}</span>
          {
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
              aria-hidden
            />
          }
        </Button>

        <Popover.Content
          placement="bottom start"
          offset={8}
          className="p-0 border border-ink-200/80 shadow-2xl rounded-2xl bg-surface overflow-hidden"
        >
          <Popover.Dialog aria-label={t("picker")} className="p-0">
            <div className="flex flex-col">
              {/* Üst gövde: Sol tarafta şablonlar, dikey çizgi, sağ tarafta takvim */}
              <div className="flex flex-col sm:flex-row">
                {/* Sol: Hazır Şablonlar */}
                <div className="w-full sm:w-36 shrink-0 p-3 flex flex-col gap-0.5 border-b sm:border-b-0 sm:border-r border-ink-200/80 bg-ink-50/40">
                  <button
                    type="button"
                    onClick={() => setSelectedPreset("custom")}
                    className={cn(
                      "w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors",
                      selectedPreset === "custom"
                        ? "bg-ink-200/80 font-medium text-foreground shadow-xs"
                        : "text-ink-700 hover:bg-ink-100/80 hover:text-foreground",
                    )}
                  >
                    {t("custom")}
                  </button>

                  <div className="my-1 border-t border-ink-200/60" />

                  {PRESETS_GROUP_1.map(renderPresetButton)}

                  <div className="my-1 border-t border-ink-200/60" />

                  {PRESETS_GROUP_2.map(renderPresetButton)}
                </div>

                {/* Sağ: HeroUI RangeCalendar */}
                <div className="p-3 bg-surface">
                  <RangeCalendar
                    aria-label={t("picker")}
                    value={tempRange}
                    onChange={handleCalendarChange}
                    isYearPickerOpen={yearPickerOpen}
                    onYearPickerOpenChange={setYearPickerOpen}
                    className="border-none bg-transparent shadow-none"
                  >
                    <RangeCalendar.Header>
                      <RangeCalendar.YearPickerTrigger>
                        <RangeCalendar.YearPickerTriggerHeading />
                        <RangeCalendar.YearPickerTriggerIndicator />
                      </RangeCalendar.YearPickerTrigger>
                      <RangeCalendar.NavButton slot="previous" />
                      <RangeCalendar.NavButton slot="next" />
                    </RangeCalendar.Header>
                    <RangeCalendar.Grid>
                      <RangeCalendar.GridHeader>
                        {(day) => (
                          <RangeCalendar.HeaderCell>
                            {day}
                          </RangeCalendar.HeaderCell>
                        )}
                      </RangeCalendar.GridHeader>
                      <RangeCalendar.GridBody>
                        {(date) => <RangeCalendar.Cell date={date} />}
                      </RangeCalendar.GridBody>
                    </RangeCalendar.Grid>
                    <RangeCalendar.YearPickerGrid>
                      <RangeCalendar.YearPickerGridBody>
                        {({ year }) => (
                          <RangeCalendar.YearPickerCell year={year} />
                        )}
                      </RangeCalendar.YearPickerGridBody>
                    </RangeCalendar.YearPickerGrid>
                  </RangeCalendar>
                </div>
              </div>

              {/* Alt Bilgi & İşlem Butonları */}
              <div className="border-t border-ink-200/80 px-4 py-3 bg-ink-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground tracking-tight">
                    {footerDateText}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-ink-400 font-normal">
                    <Globe className="h-3.5 w-3.5" />
                    GMT +01:00
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {hasActiveRange || tempRange ? (
                    <Button
                      size="sm"
                      onPress={handleClear}
                      className="text-xs font-medium h-8 px-2.5"
                      variant={actionVariant("danger", "light")}
                    >
                      {tCommon("clear")}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    onPress={() => setIsOpen(false)}
                    className="h-8 px-4 text-xs font-medium border border-ink-300 rounded-lg hover:bg-ink-100 text-foreground"
                    variant={actionVariant("default", "bordered")}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    size="sm"
                    onPress={handleApply}
                    isDisabled={!tempRange}
                    className="h-8 px-4 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-lg shadow-xs transition-colors"
                    variant={actionVariant("default", "solid")}
                  >
                    {t("apply")}
                  </Button>
                </div>
              </div>
            </div>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>

      {hasActiveRange ? (
        <Tooltip delay={300}>
          <Button
            isIconOnly
            size="sm"
            aria-label={t("clear")}
            className="h-9 w-7 min-w-7 ml-1 text-ink-400 hover:text-danger hover:bg-danger-50/50 rounded-lg transition-colors"
            onPress={handleClear}
            variant={actionVariant("default", "light")}
          >
            <X className="h-4 w-4" />
          </Button>
          <Tooltip.Content>{t("clear")}</Tooltip.Content>
        </Tooltip>
      ) : null}
    </div>
  );
}
