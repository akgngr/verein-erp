import "server-only";

import { atTime, defineModuleCalendar } from "@/shared/calendar/define";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { meetingsPermissions } from "./permissions";

/** Toplantılar takvimde (iptal edilenler hariç). Katılımcı adları yok. */
export const calendar = defineModuleCalendar({
  module: "meetings",
  sources: [{
    key: "meetings",
    color: "#8b5cf6",
    load: async ({ from, to }, user) => {
      if (!can(user.role, meetingsPermissions, "view")) return [];
      const rows = await getDb().meeting.findMany({
        where: { status: { not: "CANCELLED" }, deletedAt: null, meetingDate: { gte: new Date(from.getTime() - 86_400_000), lt: to } },
        select: { id: true, title: true, meetingDate: true, startTime: true, endTime: true, location: true },
        orderBy: { meetingDate: "asc" },
        take: 500,
      });
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        start: atTime(row.meetingDate, row.startTime),
        end: row.startTime ? atTime(row.meetingDate, row.endTime ?? null) : null,
        allDay: !row.startTime,
        location: row.location,
        href: `/toplantilar/${row.id}`,
      }));
    },
  }],
});
