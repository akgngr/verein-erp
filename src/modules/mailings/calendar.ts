import "server-only";

import { defineModuleCalendar } from "@/shared/calendar/define";
import { getDb } from "@/shared/db";
import { can } from "@/shared/permissions/define";

import { mailingsPermissions } from "./permissions";

/** Planlı kampanyalar takvimde görünür (gönderim zamanı). */
export const calendar = defineModuleCalendar({
  module: "mailings",
  sources: [
    {
      key: "scheduled",
      color: "#ec4899",
      load: async (range, user) => {
        if (!can(user.role, mailingsPermissions, "view")) return [];
        const rows = await getDb().mailingCampaign.findMany({
          where: { status: { in: ["SCHEDULED", "SENDING", "DONE"] }, scheduledAt: { gte: range.from, lt: range.to } },
          select: { id: true, name: true, subject: true, scheduledAt: true },
          take: 200,
        });
        return rows.map((row) => ({ id: row.id, title: row.name || row.subject, start: row.scheduledAt!, allDay: false, href: "/toplu-eposta" }));
      },
    },
  ],
});
