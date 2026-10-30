import { ClipboardCheck } from "lucide-react";

import { StatCardBody } from "@/shared/components/dashboard/card-bodies";
import { getDb } from "@/shared/db";
import { defineCards } from "@/shared/types/dashboard";

import { teacherCourseScope } from "@/modules/courses/server";

import { progressPermissions } from "../permissions";

/** Son 30 günün devam oranı (öğretmen için yalnızca kendi kursları). */
export const cards = defineCards([
  {
    key: "attendance",
    titleKey: "cards.attendance.title",
    descriptionKey: "cards.attendance.description",
    icon: ClipboardCheck,
    size: "sm",
    defaultVisible: true,
    href: "/ogrenci-takibi",
    permission: { definition: progressPermissions, action: "view" },
    render: async ({ t, user }) => {
      const scope = await teacherCourseScope(user);
      const since = new Date(Date.now() - 30 * 86_400_000);
      const rows = await getDb().progressAttendance.groupBy({
        by: ["status"],
        where: { updatedAt: { gte: since }, ...(scope ? { courseId: { in: scope } } : {}) },
        _count: true,
      });
      const count = (status: string) => rows.find((row) => row.status === status)?._count ?? 0;
      const attended = count("PRESENT") + count("LATE");
      const counted = attended + count("ABSENT");
      return (
        <StatCardBody
          value={counted > 0 ? `${Math.round((attended / counted) * 100)}%` : "—"}
          label={t("cards.attendance.rate")}
          tone={counted > 0 && attended / counted < 0.75 ? "warning" : "default"}
          details={[
            { label: t("cards.attendance.absent"), value: count("ABSENT"), tone: count("ABSENT") > 0 ? "danger" : "default" },
            { label: t("cards.attendance.excused"), value: count("EXCUSED") },
          ]}
        />
      );
    },
  },
]);
