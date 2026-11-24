import "server-only";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";

export type PortalEventRow = {
  id: string;
  title: string;
  startDate: Date;
  location: string | null;
  isOnline: boolean;
  capacity: number | null;
  registeredCount: number;
  isRegistered: boolean;
};

export async function listPublishedEventsForPortal(memberId: string): Promise<PortalEventRow[]> {
  const db = getDb();
  const now = new Date();
  const events = await db.event.findMany({
    where: { status: "PUBLISHED", startDate: { gte: now } },
    orderBy: { startDate: "asc" },
    take: 25,
    include: {
      attendees: {
        where: { status: { not: "CANCELLED" } },
        select: { memberId: true },
      },
    },
  });

  return events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    startDate: ev.startDate,
    location: ev.location,
    isOnline: ev.isOnline,
    capacity: ev.capacity,
    registeredCount: ev.attendees.length,
    isRegistered: ev.attendees.some((a) => a.memberId === memberId),
  }));
}

export async function registerMemberForEventForPortal(input: {
  memberId: string;
  subjectRef: string;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string | null;
}): Promise<{ ok: true } | { ok: false; reason: "notFound" | "alreadyRegistered" | "full" }> {
  const db = getDb();
  const event = await db.event.findFirst({
    where: { id: input.eventId, status: "PUBLISHED" },
    include: {
      attendees: {
        where: { status: { not: "CANCELLED" } },
        select: { memberId: true },
      },
    },
  });
  if (!event) return { ok: false, reason: "notFound" };

  if (event.attendees.some((a) => a.memberId === input.memberId)) {
    return { ok: false, reason: "alreadyRegistered" };
  }
  if (event.capacity !== null && event.attendees.length >= event.capacity) {
    return { ok: false, reason: "full" };
  }

  const attendee = await db.eventAttendee.create({
    data: {
      eventId: event.id,
      memberId: input.memberId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      status: "REGISTERED",
    },
    select: { id: true },
  });

  await writeAudit({
    userId: input.subjectRef,
    userLabel: "Member Portal",
    action: "PORTAL_EVENT_REGISTERED",
    entity: "EventAttendee",
    entityId: attendee.id,
    after: { eventId: event.id, memberId: input.memberId },
  });

  return { ok: true };
}
