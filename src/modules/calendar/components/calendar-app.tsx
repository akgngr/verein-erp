"use client";

import { notify } from "@/shared/components/ui/notify";
import { Checkbox, InputGroup, Label, Spinner, TextField, Tooltip, Button, ButtonGroup } from "@/shared/components/kit";

import { FieldClearButton } from "@/shared/components/forms/field-clear-button";


import { actionVariant } from "@/shared/components/ui/action-appearance";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { useHydrated } from "@/shared/hooks/use-hydrated";

import { loadRangeAction } from "../actions/calendar-actions";
import {
  isoWeek,
  monthGrid,
  sameDay,
  shiftAnchor,
  startOfDay,
  type CalendarView,
  viewRange,
} from "../lib/dates";
import type {
  CalendarItemView,
  CalendarSourceView,
  SyncSettingsData,
} from "../types";
import { AgendaList } from "./agenda-list";
import { CalendarSettings } from "./calendar-settings";
import { EntryDrawer, type DrawerState } from "./entry-drawer";
import { MonthGrid } from "./month-grid";
import { TimeGrid } from "./time-grid";

const HIDDEN_KEY = "calendar.hiddenSources";

type Props = {
  sources: CalendarSourceView[];
  canManageShared: boolean;
  hasFeed: boolean;
  sync: SyncSettingsData;
};

export function CalendarApp(props: Props) {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Spinner></Spinner>
      </div>
    );
  }
  return <CalendarAppInner {...props} />;
}

function CalendarAppInner({ sources, canManageShared, hasFeed, sync }: Props) {
  const t = useTranslations("calendar");
  const locale = useLocale();
  const [view, setView] = useState<CalendarView>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [miniMonth, setMiniMonth] = useState(() => new Date());
  const [items, setItems] = useState<CalendarItemView[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(() => {
    try {
      return new Set(
        JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? "[]") as string[],
      );
    } catch {
      return new Set();
    }
  });
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  // Returning from an OAuth consent screen: ?sync=connected|error opens the settings once.
  const [syncResult] = useState(() =>
    new URLSearchParams(window.location.search).get("sync"),
  );
  const [settingsOpen, setSettingsOpen] = useState(Boolean(syncResult));
  useEffect(() => {
    if (!syncResult) return;
    (syncResult === "connected" ? notify.success : notify.error)(t(syncResult === "connected" ? "sync.connected" : "sync.errors.failed"));
    const url = new URL(window.location.href);
    url.searchParams.delete("sync");
    window.history.replaceState(null, "", url);
  }, [syncResult, t]);
  const [loading, startLoading] = useTransition();

  const range = useMemo(() => viewRange(view, anchor), [view, anchor]);
  const reload = useCallback(
    () =>
      startLoading(async () => {
        const response = await loadRangeAction({
          from: range.from.toISOString(),
          to: range.to.toISOString(),
        });
        if (!response.ok)
          return void notify.error(response.error);
        setItems(response.data);
      }),
    [range],
  );
  useEffect(() => {
    reload();
  }, [reload]);

  const toggleSource = (id: string) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
      } catch {
        /* storage unavailable */
      }
      return next;
    });

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return items.filter(
      (item) =>
        !hidden.has(item.sourceId) &&
        (!needle ||
          `${item.title} ${item.location ?? ""}`
            .toLocaleLowerCase(locale)
            .includes(needle)),
    );
  }, [items, hidden, query, locale]);

  const sourceById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );
  const writable = sources.filter(
    (source) =>
      source.editable &&
      (source.kind === "PERSONAL" || source.kind === "SHARED"),
  );

  const title = new Intl.DateTimeFormat(
    locale,
    view === "day"
      ? { day: "numeric", month: "long", year: "numeric" }
      : { month: "long", year: "numeric" },
  ).format(anchor);
  const today = new Date();

  const openCreate = (start: Date, allDay = false) => {
    if (!writable.length) return;
    const end = new Date(start.getTime() + (allDay ? 0 : 60 * 60_000));
    setDrawer({
      mode: "create",
      calendarId: writable[0].id.slice("calendar:".length),
      start,
      end,
      allDay,
    });
  };

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[560px] flex-col overflow-hidden rounded-xl border border-ink-200 bg-surface">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 px-4 py-3">
        <Button
          size="sm"
          onPress={() => {
            setAnchor(startOfDay(new Date()));
            setMiniMonth(new Date());
          }}
          variant={actionVariant("default", "flat")}
        >
          {<CalendarDays className="h-4 w-4" />}
          {t("today")}
        </Button>
        <Button
          isIconOnly
          size="sm"
          aria-label={t("previous")}
          onPress={() => setAnchor((current) => shiftAnchor(view, current, -1))}
          variant={actionVariant("default", "light")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          aria-label={t("next")}
          onPress={() => setAnchor((current) => shiftAnchor(view, current, 1))}
          variant={actionVariant("default", "light")}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-semibold capitalize">{title}</h2>
        {view !== "month" ? (
          <span className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-medium">
            {t("week", { week: isoWeek(anchor) })}
          </span>
        ) : null}
        {loading ? <Spinner size="sm"></Spinner> : null}
        <div className="ms-auto flex items-center gap-2">
          <ButtonGroup size="sm" variant={actionVariant("default", "flat")}>
            {(["day", "week", "month", "agenda"] as const).map((option) => (
              <Button
                key={option}
                onPress={() => setView(option)}
                variant={actionVariant(
                  view === option ? "primary" : "default",
                  "solid",
                )}
              >
                {t(`views.${option}`)}
              </Button>
            ))}
          </ButtonGroup>
          {writable.length ? (
            <Button
              size="sm"
              onPress={() =>
                openCreate(
                  new Date(Math.ceil(Date.now() / 3_600_000) * 3_600_000),
                )
              }
              variant={actionVariant("primary", "solid")}
            >
              {<Plus className="h-4 w-4" />}
              {t("newEntry")}
            </Button>
          ) : null}
          <Tooltip>
            <Button
              isIconOnly
              size="sm"
              aria-label={t("settings.title")}
              onPress={() => setSettingsOpen(true)}
              variant={actionVariant("default", "light")}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Tooltip.Content>{t("settings.title")}</Tooltip.Content>
          </Tooltip>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 flex-col gap-4 border-e border-ink-200 p-4 lg:flex">
          <MiniMonth
            month={miniMonth}
            selected={anchor}
            today={today}
            locale={locale}
            onMonth={(delta) =>
              setMiniMonth(
                (current) =>
                  new Date(
                    current.getFullYear(),
                    current.getMonth() + delta,
                    1,
                  ),
              )
            }
            onPick={(date) => {
              setAnchor(startOfDay(date));
              if (view === "agenda") setView("day");
            }}
            labels={{
              previous: t("previous"),
              next: t("next"),
              previousYear: t("previousYear"),
              nextYear: t("nextYear"),
            }}
          />
          <TextField
            value={query}
            onChange={setQuery}
            className={["w-full"].filter(Boolean).join(" ")}
          >
            <InputGroup>
              <InputGroup.Prefix>
                {<Search className="h-4 w-4 text-ink-400" />}
              </InputGroup.Prefix>
              <InputGroup.Input
                placeholder={t("search")}
                className={["h-9 text-sm"].filter(Boolean).join(" ")}
              />
              <InputGroup.Suffix>
                {query ? (
                  <FieldClearButton onPress={() => setQuery("")} />
                ) : null}
              </InputGroup.Suffix>
            </InputGroup>
          </TextField>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase text-ink-500">
              {t("calendars")}
            </p>
            {sources.map((source) => (
              <Checkbox
                key={source.id}
                isSelected={!hidden.has(source.id)}
                style={{ ["--source-color" as string]: source.color }}
                onChange={() => toggleSource(source.id)}
              >
                  <Label>
                    <span className="text-sm">{source.label}</span>
                  </Label>
              </Checkbox>
            ))}
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {view === "month" ? (
            <MonthGrid
              anchor={anchor}
              items={visible}
              today={today}
              locale={locale}
              moreLabel={(count) => t("more", { count })}
              onDay={(date) => {
                setAnchor(date);
                setView("day");
              }}
              onCreate={(date) => openCreate(date, true)}
              onItem={(item) => setDrawer({ mode: "view", item })}
            />
          ) : view === "agenda" ? (
            <AgendaList
              from={range.from}
              items={visible}
              locale={locale}
              emptyLabel={t("emptyAgenda")}
              allDayLabel={t("allDay")}
              onItem={(item) => setDrawer({ mode: "view", item })}
            />
          ) : (
            <TimeGrid
              days={
                view === "day"
                  ? [range.from]
                  : Array.from(
                      { length: 7 },
                      (_, index) =>
                        new Date(
                          range.from.getFullYear(),
                          range.from.getMonth(),
                          range.from.getDate() + index,
                        ),
                    )
              }
              items={visible}
              today={today}
              locale={locale}
              allDayLabel={t("allDay")}
              onSlot={(date, allDay) => openCreate(date, allDay)}
              onItem={(item) => setDrawer({ mode: "view", item })}
            />
          )}
        </div>
      </div>

      <EntryDrawer
        state={drawer}
        sources={writable}
        sourceById={sourceById}
        onClose={() => setDrawer(null)}
        onEdit={(item) => setDrawer({ mode: "edit", item })}
        onSaved={() => {
          setDrawer(null);
          reload();
        }}
      />
      <CalendarSettings
        isOpen={settingsOpen}
        onOpenChange={setSettingsOpen}
        sources={sources}
        canManageShared={canManageShared}
        hasFeed={hasFeed}
        sync={sync}
      />
    </div>
  );
}

function MiniMonth({
  month,
  selected,
  today,
  locale,
  onMonth,
  onPick,
  labels,
}: {
  month: Date;
  selected: Date;
  today: Date;
  locale: string;
  onMonth: (delta: number) => void;
  onPick: (date: Date) => void;
  labels: {
    previous: string;
    next: string;
    previousYear: string;
    nextYear: string;
  };
}) {
  const days = monthGrid(month);
  const weekdays = days
    .slice(0, 7)
    .map((day) =>
      new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(day),
    );
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex">
          <Button
            isIconOnly
            size="sm"
            aria-label={labels.previousYear}
            onPress={() => onMonth(-12)}
            variant={actionVariant("default", "light")}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            aria-label={labels.previous}
            onPress={() => onMonth(-1)}
            variant={actionVariant("default", "light")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-semibold capitalize">
          {new Intl.DateTimeFormat(locale, {
            month: "long",
            year: "numeric",
          }).format(month)}
        </span>
        <div className="flex">
          <Button
            isIconOnly
            size="sm"
            aria-label={labels.next}
            onPress={() => onMonth(1)}
            variant={actionVariant("default", "light")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            isIconOnly
            size="sm"
            aria-label={labels.nextYear}
            onPress={() => onMonth(12)}
            variant={actionVariant("default", "light")}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {weekdays.map((day, index) => (
          <span key={index} className="font-medium text-ink-500">
            {day}
          </span>
        ))}
        {days.map((day) => {
          const inMonth = day.getMonth() === month.getMonth();
          const isSelected = sameDay(day, selected);
          const isToday = sameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onPick(day)}
              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full ${isSelected ? "bg-accent text-accent-foreground" : isToday ? "bg-brand-100 font-semibold text-accent" : inMonth ? "hover:bg-ink-100" : "text-ink-400 hover:bg-ink-100"}`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
