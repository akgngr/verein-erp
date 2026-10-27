import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";

import { berlinToday } from "../utils";
import type { MeetingStats } from "../types";

/**
 * Panel istatistikleri (11. bölüm): planlanan toplantılar (bugün ve sonrası),
 * sıradaki toplantı, onay bekleyen tutanaklar (HELD), açık ve gecikmiş görevler.
 * "Bugün" Europe/Berlin takvimine göredir; silinmiş toplantılar dışarıda bırakılır.
 */
export async function getMeetingStats(): Promise<MeetingStats> {
  const db = getDb();
  const today = berlinToday();

  const plannedWhere: Prisma.MeetingWhereInput = {
    deletedAt: null,
    status: "PLANNED",
    meetingDate: { gte: today },
  };

  const [plannedCount, nextMeeting, draftMinutesCount, openActionItems, overdueActionItems] =
    await Promise.all([
      db.meeting.count({ where: plannedWhere }),
      db.meeting.findFirst({
        where: plannedWhere,
        orderBy: [{ meetingDate: "asc" }, { startTime: "asc" }],
        select: { id: true, meetingNumber: true, title: true, meetingDate: true },
      }),
      db.meeting.count({ where: { deletedAt: null, status: "HELD" } }),
      db.actionItem.count({ where: { status: "OPEN", meeting: { deletedAt: null } } }),
      db.actionItem.count({
        where: { status: "OPEN", dueDate: { lt: today }, meeting: { deletedAt: null } },
      }),
    ]);

  return {
    plannedCount,
    nextMeeting,
    draftMinutesCount,
    openActionItems,
    overdueActionItems,
  };
}
