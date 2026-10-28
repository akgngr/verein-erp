import "server-only";

import { getDb } from "@/shared/db";
import type { EventDetailData } from "../types";

export async function getEventById(id: string): Promise<EventDetailData | null> {
  const db = getDb();
  const item = await db.event.findUnique({
    where: { id },
    include: {
      attendees: {
        orderBy: { registeredAt: "desc" },
      },
    },
  });

  if (!item) {
    return null;
  }

  const registeredCount = item.attendees.filter((a: { status: string }) => a.status !== "CANCELLED").length;
  const attendedCount = item.attendees.filter((a: { status: string }) => a.status === "ATTENDED").length;

  return {
    id: item.id,
    title: item.title,
    description: item.description,
    type: item.type as EventDetailData["type"],
    status: item.status as EventDetailData["status"],
    startDate: item.startDate,
    endDate: item.endDate,
    location: item.location,
    isOnline: item.isOnline,
    onlineUrl: item.onlineUrl,
    capacity: item.capacity,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    registeredCount,
    attendedCount,
    attendees: item.attendees.map((att: {
      id: string;
      eventId: string;
      memberId: string | null;
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      status: string;
      notes: string | null;
      registeredAt: Date;
      updatedAt: Date;
    }) => ({
      id: att.id,
      eventId: att.eventId,
      memberId: att.memberId,
      firstName: att.firstName,
      lastName: att.lastName,
      email: att.email,
      phone: att.phone,
      status: att.status as EventDetailData["attendees"][number]["status"],
      notes: att.notes,
      registeredAt: att.registeredAt,
      updatedAt: att.updatedAt,
    })),
  };
}
