import "server-only";

import { defineModuleCalendar } from "@/shared/calendar/define";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { eventsPermissions } from "./permissions";

/** Etkinlikler takvimde (iptal edilenler hariç). Katılımcı bilgisi yok. */
export const calendar = defineModuleCalendar({
  module: "events",
  sources: [{
    key: "events",
    color: "#f97316",
    load: async ({ from, to }, user) => {
      if (!can(user.role, eventsPermissions, "view")) return [];
      const rows = await getDb().event.findMany({
        where: { status: { not: "CANCELLED" }, startDate: { lt: to }, OR: [{ endDate: { gte: from } }, { endDate: null, startDate: { gte: from } }] },
        select: { id: true, title: true, startDate: true, endDate: true, location: true },
        orderBy: { startDate: "asc" },
        take: 500,
      });
      return rows.map((row) => ({ id: row.id, title: row.title, start: row.startDate, end: row.endDate, allDay: false, location: row.location, href: "/events" }));
    },
  }],
});
