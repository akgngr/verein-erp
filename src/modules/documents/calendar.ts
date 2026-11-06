import "server-only";

import { defineModuleCalendar } from "@/shared/calendar/define";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { documentsPermissions } from "./permissions";

/** Açık evrakların son işlem tarihleri (tüm gün). Başlık kayıt numarası + konu. */
export const calendar = defineModuleCalendar({
  module: "documents",
  sources: [{
    key: "due",
    color: "#ef4444",
    load: async ({ from, to }, user) => {
      if (!can(user.role, documentsPermissions, "view")) return [];
      const rows = await getDb().document.findMany({
        where: { status: { in: ["OPEN", "IN_PROGRESS"] }, deletedAt: null, dueDate: { gte: from, lt: to } },
        select: { id: true, registryNumber: true, subject: true, dueDate: true },
        orderBy: { dueDate: "asc" },
        take: 500,
      });
      return rows.map((row) => ({ id: row.id, title: `${row.registryNumber} · ${row.subject}`, start: row.dueDate!, end: null, allDay: true, href: `/evrak/${row.id}` }));
    },
  }],
});
