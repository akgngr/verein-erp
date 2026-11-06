import "server-only";

import { atTime, defineModuleCalendar } from "@/shared/calendar/define";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { courseSessionsPermissions } from "./permissions";

/** Kurs oturumları (iptal edilen kurslar hariç). Öğretmen/öğrenci adı yok. */
export const calendar = defineModuleCalendar({
  module: "courses",
  sources: [{
    key: "sessions",
    color: "#0ea5e9",
    load: async ({ from, to }, user) => {
      if (!can(user.role, courseSessionsPermissions, "view")) return [];
      const rows = await getDb().courseSession.findMany({
        where: { date: { gte: new Date(from.getTime() - 86_400_000), lt: to }, course: { status: { not: "CANCELLED" } } },
        select: { id: true, date: true, startTime: true, endTime: true, course: { select: { id: true, code: true, title: true, location: true } } },
        orderBy: { date: "asc" },
        take: 1000,
      });
      return rows.map((row) => ({
        id: row.id,
        title: `${row.course.code} · ${row.course.title}`,
        start: atTime(row.date, row.startTime),
        end: row.startTime ? atTime(row.date, row.endTime ?? null) : null,
        allDay: !row.startTime,
        location: row.course.location,
        href: `/kurslar/${row.course.id}`,
      }));
    },
  }],
});
