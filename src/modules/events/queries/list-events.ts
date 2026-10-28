import "server-only";

import { getDb } from "@/shared/db";
import type { EventFilters, EventRow, EventStats } from "../types";
import { DEFAULT_PAGE_SIZE } from "../constants";

export async function listEvents(filters: EventFilters = {}): Promise<{
  items: EventRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: EventStats;
}> {
  const db = getDb();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE);
  const skip = (page - 1) * pageSize;

  const now = new Date();
  const whereConditions: Record<string, unknown> = {};

  if (filters.query && filters.query.trim().length > 0) {
    const q = filters.query.trim();
    whereConditions.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { location: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filters.type && filters.type !== "ALL") {
    whereConditions.type = filters.type;
  }

  if (filters.status && filters.status !== "ALL") {
    whereConditions.status = filters.status;
  }

  if (filters.timeFilter === "upcoming") {
    whereConditions.startDate = { gte: now };
  } else if (filters.timeFilter === "past") {
    whereConditions.startDate = { lt: now };
  }

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [rawItems, total, totalAllEvents, upcomingCount, currentMonthAttendees] = await Promise.all([
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
  ]);

  const items: EventRow[] = rawItems.map((item: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    status: string;
    startDate: Date;
    endDate: Date | null;
    location: string | null;
    isOnline: boolean;
    onlineUrl: string | null;
    capacity: number | null;
    createdAt: Date;
    updatedAt: Date;
    attendees: Array<{ status: string }>;
  }) => {
    const registeredCount = item.attendees.filter((a) => a.status !== "CANCELLED").length;
    const attendedCount = item.attendees.filter((a) => a.status === "ATTENDED").length;

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
      isPast: item.startDate < new Date(),
    };
  });

  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    stats: {
      totalEvents: totalAllEvents,
      upcomingEventsCount: upcomingCount,
      totalAttendeesMonth: currentMonthAttendees,
    },
  };
}
