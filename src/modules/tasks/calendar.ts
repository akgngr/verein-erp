import "server-only";

import { defineModuleCalendar } from "@/shared/calendar/define";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { tasksPermissions } from "./permissions";

/** Açık görevlerin son tarihleri (tüm gün). Atanan kişi bilgisi yok. */
export const calendar = defineModuleCalendar({
  module: "tasks",
  sources: [{
    key: "due",
    color: "#10b981",
    load: async ({ from, to }, user) => {
      if (!can(user.role, tasksPermissions, "view")) return [];
      const rows = await getDb().task.findMany({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] }, dueDate: { gte: from, lt: to } },
        select: { id: true, title: true, dueDate: true },
        orderBy: { dueDate: "asc" },
        take: 500,
      });
      return rows.map((row) => ({ id: row.id, title: row.title, start: row.dueDate!, end: null, allDay: true, href: "/tasks" }));
    },
  }],
});
