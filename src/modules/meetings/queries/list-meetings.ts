import "server-only";

import type { MeetingStatus, MeetingType, Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { MeetingListItem, MeetingListFilterKeys } from "../types";

/** Sıralanabilir alanlar ve varsayılan sıralama (7.1). */
export const MEETING_SORTABLE_FIELDS = [
  "meetingNumber",
  "meetingDate",
  "title",
  "status",
] as const;

export const MEETING_DEFAULT_SORT = "meetingDate";

/**
 * Filtre oluşturucu (7.1): silinmiş toplantılar her koşulda dışarıda bırakılır.
 * Arama q: numara, başlık, yer, gündem başlıkları, karar metinleri.
 */
export function buildMeetingWhere(
  params: ListParams<MeetingListFilterKeys>,
): Prisma.MeetingWhereInput {
  const conditions: Prisma.MeetingWhereInput[] = [{ deletedAt: null }];

  if (params.q) {
    conditions.push({
      OR: [
        { meetingNumber: { contains: params.q, mode: "insensitive" } },
        { title: { contains: params.q, mode: "insensitive" } },
        { location: { contains: params.q, mode: "insensitive" } },
        { agendaItems: { some: { title: { contains: params.q, mode: "insensitive" } } } },
        { decisions: { some: { text: { contains: params.q, mode: "insensitive" } } } },
      ],
    });
  }

  if (params.filters.type) {
    conditions.push({ type: params.filters.type as MeetingType });
  }

  if (params.filters.status) {
    conditions.push({ status: params.filters.status as MeetingStatus });
  }

  // Tarih aralığı meetingDate (@db.Date) üzerinden; to dahil olsun diye ertesi gün başına kadar.
  const dateRange: Prisma.DateTimeFilter = {};
  if (params.filters.from && /^\d{4}-\d{2}-\d{2}$/.test(params.filters.from)) {
    dateRange.gte = new Date(`${params.filters.from}T00:00:00.000Z`);
  }
  if (params.filters.to && /^\d{4}-\d{2}-\d{2}$/.test(params.filters.to)) {
    dateRange.lte = new Date(`${params.filters.to}T23:59:59.999Z`);
  }
  if (dateRange.gte || dateRange.lte) {
    conditions.push({ meetingDate: dateRange });
  }

  return { AND: conditions };
}

/** Toplantı listesi (7.1): karar sayısı ve açık görev sayısı dahildir. */
export async function listMeetings(
  params: ListParams<MeetingListFilterKeys>,
): Promise<ListResult<MeetingListItem>> {
  const db = getDb();
  const where = buildMeetingWhere(params);

  const orderBy: Prisma.MeetingOrderByWithRelationInput =
    params.sort === "meetingNumber"
      ? { meetingNumber: params.dir }
      : params.sort === "title"
        ? { title: params.dir }
        : params.sort === "status"
          ? { status: params.dir }
          : { meetingDate: params.dir };

  const [rows, total] = await Promise.all([
    db.meeting.findMany({
      where,
      orderBy: [orderBy, { id: "asc" }],
      skip: params.skip,
      take: params.take,
      select: {
        id: true,
        meetingNumber: true,
        type: true,
        title: true,
        meetingDate: true,
        startTime: true,
        location: true,
        status: true,
        _count: {
          select: {
            decisions: true,
            actionItems: { where: { status: "OPEN" } },
          },
        },
      },
    }),
    db.meeting.count({ where }),
  ]);

  return {
    rows: rows.map((meeting) => ({
      id: meeting.id,
      meetingNumber: meeting.meetingNumber,
      type: meeting.type,
      title: meeting.title,
      meetingDate: meeting.meetingDate,
      startTime: meeting.startTime,
      location: meeting.location,
      status: meeting.status,
      decisionCount: meeting._count.decisions,
      openActionItemCount: meeting._count.actionItems,
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}
