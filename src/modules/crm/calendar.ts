import "server-only";

import { defineModuleCalendar } from "@/shared/calendar/define";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { crmPermissions } from "./permissions";

/** Açık takipler ve açık fırsatların beklenen kapanış günleri. Kişi adı yok; yalnız not/başlık. */
export const calendar = defineModuleCalendar({
  module: "crm",
  sources: [
    {
      key: "followUps",
      color: "#f97316",
      load: async ({ from, to }, user) => {
        if (!can(user.role, crmPermissions, "view")) return [];
        const rows = await getDb().crmFollowUp.findMany({ where: { doneAt: null, dueAt: { gte: from, lt: to } }, select: { id: true, note: true, dueAt: true }, orderBy: { dueAt: "asc" }, take: 500 });
        return rows.map((row) => ({ id: row.id, title: row.note, start: row.dueAt, end: null, allDay: false, location: null, href: "/crm" }));
      },
    },
    {
      key: "deals",
      color: "#14b8a6",
      load: async ({ from, to }, user) => {
        if (!can(user.role, crmPermissions, "view")) return [];
        const rows = await getDb().crmDeal.findMany({ where: { stage: { in: ["OPEN", "PROPOSAL"] }, expectedCloseAt: { gte: from, lt: to } }, select: { id: true, title: true, expectedCloseAt: true }, take: 500 });
        return rows.map((row) => ({ id: row.id, title: row.title, start: row.expectedCloseAt!, end: null, allDay: true, location: null, href: "/crm" }));
      },
    },
  ],
});
