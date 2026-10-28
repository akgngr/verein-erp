import { getDb } from "@/shared/db"
import type { Prisma } from "@prisma/client"
import type { EventFilters, EventRow, EventStats } from "../types"
import { DEFAULT_PAGE_SIZE } from "../constants"

export async function listEvents(filters: EventFilters = {}): Promise<{
  items: EventRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  stats: EventStats
}> {
  const db = getDb()
  const page = Math.max(1, filters.page ?? 1)
  const pageSize = Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE)
  const skip = (page - 1) * pageSize

  const now = new Date()
  const whereConditions: Prisma.EventWhereInput = {}

  if (filters.query && filters.query.trim().length > 0) {
    const q = filters.query.trim()
    whereConditions.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ]
  }

  if (filters.type && filters.type !== "ALL") {
    whereConditions.type = filters.type
  }

  if (filters.status && filters.status !== "ALL") {
    whereConditions.status = filters.status
  }

  if (filters.timeFilter === "upcoming") {
    whereConditions.startDate = { gte: now }
  } else if (filters.timeFilter === "past") {
    whereConditions.startDate = { lt: now }
  }

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  )

  const [
    rawItems,
    total,
    totalAllEvents,
    upcomingCount,
    currentMonthAttendees,
  ] = await Promise.all([
    db.event.findMany({
      where: whereConditions,
      skip,
      take: pageSize,
      orderBy: { startDate: filters.timeFilter === "past" ? "desc" : "asc" },
      include: {
        attendees: {
          select: { status: true },
        },
      },
    }),
    db.event.count({ where: whereConditions }),
    db.event.count(),
    db.event.count({
      where: {
        startDate: { gte: now },
        status: { in: ["PUBLISHED", "DRAFT"] },
      },
    }),
    db.eventAttendee.count({
      where: {
        registeredAt: { gte: startOfMonth, lte: endOfMonth },
        status: { not: "CANCELLED" },
      },
    }),
  ])

  const nowTimestamp = now.getTime()

  const items: EventRow[] = rawItems.map((item) => {
    const registeredCount = item.attendees.filter(
      (a) => a.status !== "CANCELLED",
    ).length
    const attendedCount = item.attendees.filter(
      (a) => a.status === "ATTENDED",
    ).length
    const isPast = item.startDate.getTime() < nowTimestamp

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      type: item.type as EventRow["type"],
      status: item.status as EventRow["status"],
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
    }
  })

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize) || 1,
    stats: {
      totalEvents: totalAllEvents,
      upcomingEventsCount: upcomingCount,
      totalAttendeesMonth: currentMonthAttendees,
    },
  }
}
