import "server-only";

import { getTranslations } from "next-intl/server";

import { moduleCalendarRegistry } from "@/calendar-registry";
import { listUsableModuleKeys } from "@/modules/system/automation";
import { getDb } from "@/shared/db";

import { expandOccurrences } from "../lib/recurrence";
import type { CalendarItemView, CalendarSourceView } from "../types";
import { canWriteCalendar, ensurePersonalCalendar, listVisibleCalendars, type CalendarUser } from "./calendars";
import { loadSyncedRange } from "./sync";

/** All sources (own calendars + module sources) the user may see. */
export async function listSources(user: CalendarUser): Promise<CalendarSourceView[]> {
  const t = await getTranslations();
  await ensurePersonalCalendar(user, t("calendar.personalName"));
  const calendars = await listVisibleCalendars(user);
  const usable = new Set(await listUsableModuleKeys());
  const own: CalendarSourceView[] = calendars.map((calendar) => ({
    id: `calendar:${calendar.id}`,
    label: calendar.kind === "PERSONAL" ? t("calendar.personalName") : calendar.name,
    color: calendar.color,
    kind: calendar.kind,
    editable: canWriteCalendar(user, calendar),
  }));
  const modules: CalendarSourceView[] = moduleCalendarRegistry
    .filter((entry) => usable.has(entry.module))
    .flatMap((entry) => entry.sources.map((source) => {
      const key = `${entry.module}.calendar.${source.key}`;
      return { id: `${entry.module}:${source.key}`, label: t.has(key as never) ? t(key as never) : source.key, color: source.color, kind: "MODULE" as const, editable: false };
    }));
  const { calendars: synced } = await loadSyncedRange(user.id, new Date(0), new Date(0));
  const external: CalendarSourceView[] = synced.map((calendar) => ({
    id: `sync:${calendar.id}`,
    label: `${calendar.name} · ${calendar.account.accountLabel || calendar.account.provider}`,
    color: calendar.color,
    kind: "EXTERNAL" as const,
    editable: false,
  }));
  return [...own, ...modules, ...external];
}

/** Items in [from, to): expanded own entries plus read-only module items. */
export async function loadRange(user: CalendarUser, from: Date, to: Date): Promise<CalendarItemView[]> {
  const calendars = await listVisibleCalendars(user);
  const byId = new Map(calendars.map((calendar) => [calendar.id, calendar]));
  const entries = await getDb().calendarEntry.findMany({
    where: {
      calendarId: { in: [...byId.keys()] },
      startsAt: { lt: to },
      OR: [
        { recurrence: "NONE", endsAt: { gt: from } },
        { recurrence: { not: "NONE" }, OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: from } }] },
      ],
    },
    orderBy: { startsAt: "asc" },
    take: 2000,
  });

  const items: CalendarItemView[] = [];
  for (const entry of entries) {
    const calendar = byId.get(entry.calendarId)!;
    for (const occurrence of expandOccurrences(entry, from, to)) {
      items.push({
        id: `${entry.id}:${occurrence.start.getTime()}`,
        entryId: entry.id,
        sourceId: `calendar:${calendar.id}`,
        title: entry.title,
        start: occurrence.start.toISOString(),
        end: occurrence.end.toISOString(),
        allDay: entry.allDay,
        location: entry.location,
        description: entry.description,
        color: calendar.color,
        href: entry.eventId ? `/events/${entry.eventId}` : null,
        editable: canWriteCalendar(user, calendar),
        recurrence: entry.recurrence,
        recurrenceInterval: entry.recurrenceInterval,
        recurrenceUntil: entry.recurrenceUntil?.toISOString() ?? null,
        eventId: entry.eventId,
        calendarId: calendar.id,
      });
    }
  }

  const usable = new Set(await listUsableModuleKeys());
  const results = await Promise.all(moduleCalendarRegistry
    .filter((entry) => usable.has(entry.module))
    .flatMap((entry) => entry.sources.map(async (source) => {
      try {
        const loaded = await source.load({ from, to }, user);
        return loaded.map((item): CalendarItemView => {
          const end = item.end && item.end > item.start ? item.end : new Date(item.start.getTime() + (item.allDay ? 86_400_000 : 3_600_000));
          return {
            id: `${entry.module}:${source.key}:${item.id}`,
            entryId: null,
            sourceId: `${entry.module}:${source.key}`,
            title: item.title,
            start: item.start.toISOString(),
            end: end.toISOString(),
            allDay: item.allDay,
            location: item.location ?? null,
            description: null,
            color: source.color,
            href: item.href ?? null,
            editable: false,
            recurrence: "NONE",
            recurrenceInterval: 1,
            recurrenceUntil: null,
            eventId: null,
            calendarId: null,
          };
        });
      } catch (error) {
        // One failing module must not break the calendar.
        console.warn(`[calendar] source ${entry.module}:${source.key} failed:`, error instanceof Error ? error.message : error);
        return [];
      }
    })));
  const synced = await loadSyncedRange(user.id, from, to).catch(() => ({ calendars: [], events: [] }));
  const colors = new Map(synced.calendars.map((calendar) => [calendar.id, calendar.color]));
  const external = synced.events.map((event): CalendarItemView => ({
    id: `sync:${event.id}`,
    entryId: null,
    sourceId: `sync:${event.calendarId}`,
    title: event.title,
    start: event.startsAt.toISOString(),
    end: event.endsAt.toISOString(),
    allDay: event.allDay,
    location: event.location,
    description: event.description,
    color: colors.get(event.calendarId) ?? "#64748b",
    href: null,
    editable: false,
    recurrence: "NONE",
    recurrenceInterval: 1,
    recurrenceUntil: null,
    eventId: null,
    calendarId: null,
  }));
  return [...items, ...results.flat(), ...external].sort((a, b) => a.start.localeCompare(b.start));
}
