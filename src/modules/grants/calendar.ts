import "server-only";

import { defineModuleCalendar } from "@/shared/calendar/define";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { grantsPermissions } from "./permissions";

/** Verwendungsnachweis teslim tarihleri ve hibe dönem sonları (yalnız hibe adı). */
export const calendar = defineModuleCalendar({
  module: "grants",
  sources: [{
    key: "reports",
    color: "#ca8a04",
    load: async ({ from, to }, user) => {
      if (!can(user.role, grantsPermissions, "view")) return [];
      const rows = await getDb().grant.findMany({ where: { reportSubmittedAt: null, reportDueAt: { gte: new Date(from.getTime() - 86_400_000), lt: to } }, select: { id: true, name: true, reportDueAt: true }, take: 200 });
      return rows.map((row) => ({ id: row.id, title: row.name, start: row.reportDueAt!, end: null, allDay: true, location: null, href: `/hibeler/${row.id}` }));
    },
  }],
});
