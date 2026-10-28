import "server-only"

import { getDb } from "@/shared/db"
import { formatDateTimeTr } from "../helpers/event-helpers"

export interface EventExportRecord {
  title: string
  type: string
  status: string
  startDate: string
  endDate: string
  location: string
  capacity: string
  registeredCount: number
}

export async function exportEventsToDataset(): Promise<EventExportRecord[]> {
  const db = getDb()

  const events = await db.event.findMany({
    orderBy: { startDate: "asc" },
    include: {
      attendees: {
        select: { status: true },
      },
    },
  })

  return events.map(
    (ev: {
      title: string
      type: string
      status: string
      startDate: Date
      endDate: Date | null
      isOnline: boolean
      onlineUrl: string | null
      location: string | null
      capacity: number | null
      attendees: { status: string }[]
    }) => {
      const registeredCount = ev.attendees.filter(
        (a) => a.status !== "CANCELLED",
      ).length
      return {
        title: ev.title,
        type: ev.type,
        status: ev.status,
        startDate: formatDateTimeTr(ev.startDate),
        endDate: ev.endDate ? formatDateTimeTr(ev.endDate) : "-",
        location: ev.isOnline
          ? `Online (${ev.onlineUrl ?? "-"})`
          : (ev.location ?? "-"),
        capacity: ev.capacity ? String(ev.capacity) : "Sınırsız",
        registeredCount,
      }
    },
  )
}
