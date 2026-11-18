import "server-only";

import { parseDate } from "@internationalized/date";

import { getDb } from "@/shared/db";
import { defineModuleSecretary, type BriefingItem, type SecretaryContext } from "@/shared/secretary/define";

import { expandOccurrences } from "./lib/recurrence";
import { calendarPermissions } from "./permissions";

type CalendarCounts = { today: number; tomorrow: number; collisions: number };

function berlinDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function buildCalendarBriefing(counts: CalendarCounts, context: Pick<SecretaryContext, "t">, day: string, tomorrow: string): BriefingItem[] {
  const items: BriefingItem[] = [];
  if (counts.today > 0) items.push({
    id: "calendar:today",
    module: "calendar", kind: "today", severity: "info",
    title: context.t("secretary.today", { count: counts.today }),
    count: counts.today, dueAt: day, href: "/calendar",
  });
  if (counts.tomorrow > 0) items.push({
    id: "calendar:tomorrow",
    module: "calendar", kind: "tomorrow", severity: "info",
    title: context.t("secretary.tomorrow", { count: counts.tomorrow }),
    count: counts.tomorrow, dueAt: tomorrow, href: "/calendar",
  });
  if (counts.collisions > 0) items.push({
    id: "calendar:collisions",
    module: "calendar", kind: "collisions", severity: "warning",
    title: context.t("secretary.collisions", { count: counts.collisions }),
    count: counts.collisions, dueAt: day, href: "/calendar",
  });
  return items;
}

/** Own personal + approved shared calendars only; never query another user's personal entries or external sync. */
async function countEntries(context: SecretaryContext): Promise<{ counts: CalendarCounts; day: string; tomorrow: string }> {
  const day = berlinDay(context.now);
  const date = parseDate(day);
  const tomorrow = date.add({ days: 1 }).toString();
  const endDay = date.add({ days: 2 }).toString();
  const from = date.toDate("Europe/Berlin");
  const to = parseDate(endDay).toDate("Europe/Berlin");
  const floatingFrom = new Date(`${day}T00:00:00.000Z`);
  const floatingTo = new Date(`${endDay}T00:00:00.000Z`);
  const calendars = await getDb().calendar.findMany({
    where: { isActive: true, OR: [{ kind: "SHARED" }, { kind: "PERSONAL", ownerId: context.user.id }] },
    select: { id: true },
  });
  if (!calendars.length) return { counts: { today: 0, tomorrow: 0, collisions: 0 }, day, tomorrow };
  const entries = await getDb().calendarEntry.findMany({
    where: {
      calendarId: { in: calendars.map((calendar) => calendar.id) },
      OR: [
        { allDay: true, startsAt: { lt: floatingTo }, OR: [
          { recurrence: "NONE", endsAt: { gt: floatingFrom } },
          { recurrence: { not: "NONE" }, OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: floatingFrom } }] },
        ] },
        { allDay: false, startsAt: { lt: to }, OR: [
          { recurrence: "NONE", endsAt: { gt: from } },
          { recurrence: { not: "NONE" }, OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: from } }] },
        ] },
      ],
    },
    select: { id: true, startsAt: true, endsAt: true, allDay: true, recurrence: true, recurrenceInterval: true, recurrenceUntil: true },
    take: 500,
  });
  let today = 0;
  let next = 0;
  const timed: { start: number; end: number }[] = [];
  for (const entry of entries) {
    const start = entry.allDay ? floatingFrom : from;
    const end = entry.allDay ? floatingTo : to;
    for (const occurrence of expandOccurrences(entry, start, end)) {
      const occurrenceDay = entry.allDay ? occurrence.start.toISOString().slice(0, 10) : berlinDay(occurrence.start);
      if (occurrenceDay === day) today++;
      if (occurrenceDay === tomorrow) next++;
      if (!entry.allDay) timed.push({ start: occurrence.start.getTime(), end: occurrence.end.getTime() });
    }
  }
  timed.sort((a, b) => a.start - b.start);
  let collisions = 0;
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length && timed[j].start < timed[i].end; j++) {
      if (timed[i].start < timed[j].end) collisions++;
    }
  }
  return { counts: { today, tomorrow: next, collisions }, day, tomorrow };
}

export const secretary = defineModuleSecretary({
  module: "calendar",
  providers: [{
    key: "events",
    permission: { definition: calendarPermissions, action: "view" },
    collect: async (context) => {
      const snapshot = await countEntries(context);
      return buildCalendarBriefing(snapshot.counts, context, snapshot.day, snapshot.tomorrow);
    },
  }],
});
