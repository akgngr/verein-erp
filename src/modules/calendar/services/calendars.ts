import "server-only";

import type { Role } from "@/shared/roles";

import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { calendarPermissions } from "../permissions";

export type CalendarUser = { id: string; role: Role };

const PERSONAL_COLOR = "#3b82f6";

/** Every user gets exactly one personal calendar, created on first use. */
export async function ensurePersonalCalendar(user: CalendarUser, name: string) {
  const db = getDb();
  const existing = await db.calendar.findFirst({ where: { kind: "PERSONAL", ownerId: user.id } });
  if (existing) return existing;
  return db.calendar.create({ data: { kind: "PERSONAL", ownerId: user.id, name, color: PERSONAL_COLOR } });
}

/** Personal calendar of the user plus all active shared calendars. */
export async function listVisibleCalendars(user: CalendarUser) {
  return getDb().calendar.findMany({
    where: { isActive: true, OR: [{ kind: "SHARED" }, { kind: "PERSONAL", ownerId: user.id }] },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
}

export function canSeeCalendar(user: CalendarUser, calendar: { kind: string; ownerId: string | null }) {
  return calendar.kind === "SHARED" || calendar.ownerId === user.id;
}

/** Own personal calendar: always; shared calendars: create/update permission. */
export function canWriteCalendar(user: CalendarUser, calendar: { kind: string; ownerId: string | null }) {
  if (calendar.kind === "PERSONAL") return calendar.ownerId === user.id;
  return can(user.role, calendarPermissions, "update");
}

export function canManageSharedCalendars(user: CalendarUser) {
  return can(user.role, calendarPermissions, "approve");
}

export async function createSharedCalendar(name: string, color: string) {
  return getDb().calendar.create({ data: { kind: "SHARED", name, color }, select: { id: true } });
}

export async function updateCalendar(id: string, data: { name?: string; color?: string; isActive?: boolean }) {
  await getDb().calendar.update({ where: { id }, data });
}
