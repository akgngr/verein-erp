"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, createAction } from "@/modules/auth/server";
import { createEventAction } from "@/modules/events/server";
import { emitAutomationEvent } from "@/shared/automation/emit";
import { getDb } from "@/shared/db";
import type { ActionResult } from "@/shared/types/action";
import { buildUserLabel } from "@/shared/utils";

import { calendarEntryCreatedEvent } from "../automation";
import { calendarPermissions } from "../permissions";
import { canManageSharedCalendars, canSeeCalendar, canWriteCalendar, createSharedCalendar, updateCalendar } from "../services/calendars";
import { revokeFeedToken, rotateFeedToken } from "../services/feed";
import { loadRange } from "../services/range";
import type { CalendarItemView } from "../types";

const MAX_RANGE_DAYS = 120;
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export async function loadRangeAction(input: unknown): Promise<ActionResult<CalendarItemView[]>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: z.object({ from: z.string().datetime(), to: z.string().datetime() }),
    handler: async ({ input, user }) => {
      const from = new Date(input.from);
      const to = new Date(input.to);
      if (!(to > from) || to.getTime() - from.getTime() > MAX_RANGE_DAYS * 86_400_000) throw new ActionError("calendar.errors.range");
      return loadRange(user, from, to);
    },
  })(input);
}

const entrySchema = z.object({
  id: z.string().min(1).max(64).optional(),
  calendarId: z.string().min(1).max(64),
  title: z.string().trim().min(1, "calendar.errors.title").max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  location: z.string().trim().max(300).optional().nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  allDay: z.boolean(),
  recurrence: z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
  recurrenceInterval: z.number().int().min(1).max(99).default(1),
  recurrenceUntil: z.string().datetime().optional().nullable(),
});

async function writableCalendar(user: { id: string; role: string }, calendarId: string) {
  const calendar = await getDb().calendar.findUnique({ where: { id: calendarId } });
  if (!calendar || !calendar.isActive || !canWriteCalendar(user as never, calendar)) throw new ActionError("calendar.errors.forbidden");
  return calendar;
}

export async function saveEntryAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: entrySchema,
    handler: async ({ input, user }) => {
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(input.endsAt);
      if (endsAt < startsAt) throw new ActionError("calendar.errors.endBeforeStart");
      const calendar = await writableCalendar(user, input.calendarId);
      const data = {
        calendarId: calendar.id,
        title: input.title,
        description: input.description || null,
        location: input.location || null,
        startsAt,
        endsAt,
        allDay: input.allDay,
        recurrence: input.recurrence,
        recurrenceInterval: input.recurrenceInterval,
        recurrenceUntil: input.recurrence !== "NONE" && input.recurrenceUntil ? new Date(input.recurrenceUntil) : null,
      };
      const db = getDb();
      if (input.id) {
        const existing = await db.calendarEntry.findUnique({ where: { id: input.id }, include: { calendar: true } });
        if (!existing || !canWriteCalendar(user, existing.calendar)) throw new ActionError("calendar.errors.forbidden");
        await db.calendarEntry.update({ where: { id: input.id }, data });
        revalidatePath("/calendar");
        return { id: input.id };
      }
      const created = await db.$transaction(async (tx) => {
        const entry = await tx.calendarEntry.create({
          data: { ...data, createdById: user.id, createdByLabel: buildUserLabel(user.name, user.email) },
          select: { id: true, allDay: true },
        });
        await emitAutomationEvent(calendarEntryCreatedEvent, { entryId: entry.id, calendarKind: calendar.kind, allDay: entry.allDay }, tx);
        return entry;
      });
      revalidatePath("/calendar");
      return { id: created.id };
    },
  })(input);
}

export async function deleteEntryAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: z.object({ id: z.string().min(1).max(64) }),
    handler: async ({ input, user }) => {
      const db = getDb();
      const entry = await db.calendarEntry.findUnique({ where: { id: input.id }, include: { calendar: true } });
      if (!entry || !canWriteCalendar(user, entry.calendar)) throw new ActionError("calendar.errors.forbidden");
      await db.calendarEntry.delete({ where: { id: input.id } });
      revalidatePath("/calendar");
      return { ok: true as const };
    },
  })(input);
}

/** One click: create a DRAFT event from an appointment (events permissions apply). */
export async function convertToEventAction(input: unknown): Promise<ActionResult<{ eventId: string }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: z.object({ id: z.string().min(1).max(64) }),
    handler: async ({ input, user }) => {
      const db = getDb();
      const entry = await db.calendarEntry.findUnique({ where: { id: input.id }, include: { calendar: true } });
      if (!entry || !canSeeCalendar(user, entry.calendar)) throw new ActionError("calendar.errors.forbidden");
      if (entry.eventId) return { eventId: entry.eventId };
      const result = await createEventAction({
        title: entry.title.length >= 3 ? entry.title : `${entry.title} …`,
        description: entry.description,
        type: "OTHER",
        status: "DRAFT",
        startDate: entry.startsAt.toISOString(),
        endDate: entry.endsAt.toISOString(),
        location: entry.location,
        isOnline: false,
      } as never) as { success: boolean; data?: { id: string }; error?: string };
      if (!result.success || !result.data) throw new ActionError(result.error ?? "calendar.errors.convertFailed");
      await db.calendarEntry.update({ where: { id: entry.id }, data: { eventId: result.data.id } });
      revalidatePath("/calendar");
      return { eventId: result.data.id };
    },
  })(input);
}

export async function saveSharedCalendarAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "approve" },
    schema: z.object({ id: z.string().min(1).max(64).optional(), name: z.string().trim().min(2, "calendar.errors.name").max(80), color, isActive: z.boolean().default(true) }),
    handler: async ({ input, user }) => {
      if (!canManageSharedCalendars(user)) throw new ActionError("calendar.errors.forbidden");
      if (input.id) {
        const existing = await getDb().calendar.findUnique({ where: { id: input.id } });
        if (!existing || existing.kind !== "SHARED") throw new ActionError("calendar.errors.forbidden");
        await updateCalendar(input.id, { name: input.name, color: input.color, isActive: input.isActive });
        revalidatePath("/calendar");
        return { id: input.id };
      }
      const created = await createSharedCalendar(input.name, input.color);
      revalidatePath("/calendar");
      return created;
    },
  })(input);
}

/** Own personal calendar color (everyone can change their own). */
export async function setPersonalColorAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: z.object({ color }),
    handler: async ({ input, user }) => {
      await getDb().calendar.updateMany({ where: { kind: "PERSONAL", ownerId: user.id }, data: { color: input.color } });
      revalidatePath("/calendar");
      return { ok: true as const };
    },
  })(input);
}

/** Create/rotate the personal ICS subscription link; the token is shown once. */
export async function rotateFeedAction(input: unknown): Promise<ActionResult<{ token: string }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: z.object({}).passthrough(),
    handler: async ({ user }) => ({ token: await rotateFeedToken(user.id) }),
  })(input);
}

export async function revokeFeedAction(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return createAction({
    permission: { definition: calendarPermissions, action: "view" },
    schema: z.object({}).passthrough(),
    handler: async ({ user }) => {
      await revokeFeedToken(user.id);
      return { ok: true as const };
    },
  })(input);
}
