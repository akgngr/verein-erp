import "server-only";

import { z } from "zod";

import { DATE_RE, PROPOSED, aiAction, aiTool, defineModuleAi, isoDay } from "@/shared/ai/define";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { saveEntryAction } from "./actions/calendar-actions";
import { expandOccurrences } from "./lib/recurrence";
import { calendarPermissions } from "./permissions";

/**
 * Takvim. Yapay zekâ YALNIZ ortak takvimleri görür; kişisel takvim kayıtları ve dış takvimden
 * (Google/Outlook/Apple) alınan kayıtlar hiçbir zaman okunmaz (veri politikası: CalendarEntry K3 kuralı,
 * CalendarSyncEvent K1). Açıklama, yer ve oluşturan adı dönmez. Yazma yalnız öneri + kullanıcı onayıyla.
 * Not: modülün K1 tablolarıyla aynı adlı alanlar (ad, başlık…) burada yalnız K2/K3 satırlardan ve
 * kullanıcının kendi öneri girdisinden gelir; bu yüzden nesne ayrıştırmayla okunur.
 */
const MAX_DAYS = 120;
const TIME_RE = /^\d{2}:\d{2}$/;

const entrySchema = z.object({
  calendarId: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  allDay: z.boolean(),
  location: z.string().max(300).nullable(),
  description: z.string().max(2000).nullable(),
});

function toInstant(date: string, time: string | null, end = false): Date {
  const [y, m, d] = date.split("-").map(Number);
  if (!time) return end ? new Date(y, m - 1, d, 23, 59) : new Date(y, m - 1, d);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

export const ai = defineModuleAi({
  module: "calendar",
  tools: [
    aiTool({
      name: "list_shared_calendars",
      operation: "read",
      allowed: (user) => can(user.role, calendarPermissions, "view"),
      description: "Lists the organisation's shared calendars (id, name). Personal calendars are private and never listed.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      run: async () => {
        const rows = await getDb().calendar.findMany({ where: { kind: "SHARED", isActive: true }, select: { id: true, name: true } });
        return rows.sort(({ name: a }, { name: b }) => a.localeCompare(b));
      },
    }),
    aiTool({
      name: "list_shared_calendar_entries",
      operation: "read",
      allowed: (user) => can(user.role, calendarPermissions, "view"),
      description: "Entries of shared calendars in a date range (YYYY-MM-DD, max 120 days; recurring entries expanded): calendar, title, start, end, allDay. Personal and externally synced entries are never included. Events, meetings, tasks and course sessions have their own tools.", // i18n-ignore (model-facing tool text)
      schema: z.object({ from: z.string().regex(DATE_RE), to: z.string().regex(DATE_RE) }),
      inputSchema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } }, required: ["from", "to"], additionalProperties: false },
      run: async ({ from, to }) => {
        const start = toInstant(from, null);
        const end = toInstant(to, null, true);
        if (!(end > start) || end.getTime() - start.getTime() > MAX_DAYS * 86_400_000) return { status: "invalid_range" };
        const calendars = await getDb().calendar.findMany({ where: { kind: "SHARED", isActive: true }, select: { id: true, name: true } });
        const names = new Map(calendars.map(({ id, name }) => [id, name]));
        const entries = await getDb().calendarEntry.findMany({
          where: {
            calendarId: { in: [...names.keys()] },
            startsAt: { lt: end },
            OR: [{ recurrence: "NONE", endsAt: { gt: start } }, { recurrence: { not: "NONE" } }],
          },
          select: { id: true, calendarId: true, title: true, startsAt: true, endsAt: true, allDay: true, recurrence: true, recurrenceInterval: true, recurrenceUntil: true },
          take: 500,
        });
        return entries
          .flatMap(({ title, ...entry }) => expandOccurrences(entry, start, end).map((occurrence) => ({
            calendar: names.get(entry.calendarId),
            title,
            start: entry.allDay ? isoDay(occurrence.start) ?? "" : occurrence.start.toISOString(),
            end: entry.allDay ? isoDay(occurrence.end) ?? "" : occurrence.end.toISOString(),
            allDay: entry.allDay,
          })))
          .sort((a, b) => a.start.localeCompare(b.start))
          .slice(0, 300);
      },
    }),
    aiTool({
      name: "propose_calendar_entry",
      operation: "create",
      allowed: (user) => can(user.role, calendarPermissions, "view"),
      description: "PROPOSES adding an appointment. calendarId from list_shared_calendars, or null for the user's own personal calendar. Date YYYY-MM-DD, times HH:mm (null = all day). Nothing is created until the user confirms.", // i18n-ignore (model-facing tool text)
      schema: z.object({
        calendarId: z.string().min(1).max(64).nullable(),
        title: z.string().min(1).max(200),
        date: z.string().regex(DATE_RE),
        startTime: z.string().regex(TIME_RE).nullable(),
        endTime: z.string().regex(TIME_RE).nullable(),
        location: z.string().max(300).nullable(),
        description: z.string().max(2000).nullable(),
      }),
      inputSchema: {
        type: "object",
        properties: {
          calendarId: { type: ["string", "null"] },
          title: { type: "string" },
          date: { type: "string" },
          startTime: { type: ["string", "null"] },
          endTime: { type: ["string", "null"] },
          location: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
        },
        required: ["calendarId", "title", "date", "startTime", "endTime", "location", "description"],
        additionalProperties: false,
      },
      run: async ({ location, description, title, ...input }, { user, propose }) => {
        const db = getDb();
        const calendar = input.calendarId
          ? await db.calendar.findFirst({ where: { id: input.calendarId, kind: "SHARED", isActive: true }, select: { id: true } })
          : await db.calendar.findFirst({ where: { kind: "PERSONAL", ownerId: user.id }, select: { id: true } });
        if (!calendar) return { status: input.calendarId ? "calendar_not_found" : "open_calendar_once_first" };
        const allDay = !input.startTime;
        const startsAt = toInstant(input.date, input.startTime);
        const endsAt = allDay ? toInstant(input.date, null, true) : input.endTime ? toInstant(input.date, input.endTime) : new Date(startsAt.getTime() + 3_600_000);
        if (endsAt < startsAt) return { status: "end_before_start" };
        propose({
          action: "create",
          title,
          details: [[input.date, input.startTime && `${input.startTime}${input.endTime ? `–${input.endTime}` : ""}`].filter(Boolean).join(" "), location ?? ""].filter(Boolean),
          payload: { calendarId: calendar.id, title, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), allDay, location, description },
        });
        return PROPOSED;
      },
    }),
  ],
  actions: {
    create: aiAction({
      operation: "create",
      schema: entrySchema,
      execute: (input) => saveEntryAction({ ...input, recurrence: "NONE", recurrenceInterval: 1 }),
    }),
  },
});
