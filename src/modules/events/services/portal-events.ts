import "server-only";

import { writeAudit } from "@/shared/audit/write-audit";
import { getDb } from "@/shared/db";

import { registerAttendee } from "./attendee-registration";

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
    where: { status: "PUBLISHED", startDate: { gte: now }, deletedAt: null },
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
  // #584: Kontenjan ve mükerrer kayıt kontrolü yönetici eylemiyle aynı kilitli transaction'da yapılır.
  const result = await registerAttendee(
    {
      eventId: input.eventId,
      memberId: input.memberId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    },
    { publishedOnly: true },
  );
  if (!result.ok) return result;

  await writeAudit({
    userId: input.subjectRef,
    userLabel: "Member Portal",
    action: "PORTAL_EVENT_REGISTERED",
    entity: "EventAttendee",
    entityId: result.id,
    after: { eventId: input.eventId, memberId: input.memberId },
  });

  return { ok: true };
}
