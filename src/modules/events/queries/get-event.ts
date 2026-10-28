import { getDb } from "@/shared/db"
import type { EventDetailData } from "../types"

export async function getEventById(
  id: string,
): Promise<EventDetailData | null> {
  const db = getDb()

  const item = await db.event.findUnique({
    where: { id },
    include: {
      attendees: {
        orderBy: { registeredAt: "desc" },
      },
    },
  })

  if (!item) {
    return null
  }

  const now = new Date()
  const registeredCount = item.attendees.filter(
    (a) => a.status !== "CANCELLED",
  ).length
  const attendedCount = item.attendees.filter(
    (a) => a.status === "ATTENDED",
  ).length
  const isPast = item.startDate.getTime() < now.getTime()

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
    isPast,
    attendees: item.attendees.map((att) => ({
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
  }
}
