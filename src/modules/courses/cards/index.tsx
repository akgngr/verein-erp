import { BookOpen, CalendarClock, Coins } from "lucide-react";

import { StatCardBody, TableCardBody } from "@/shared/components/dashboard/card-bodies";
import { getDb } from "@/shared/db";
import { formatMoney } from "@/shared/money";
import { defineCards } from "@/shared/types/dashboard";
import { formatDate } from "@/shared/utils";

import { courseFeesPermissions, coursesPermissions } from "../permissions";
import { teacherCourseScope } from "../services/teacher-scope";
import { berlinToday } from "../utils";

export const cards = defineCards([
  {
    key: "overview",
    titleKey: "cards.overview.title",
    descriptionKey: "cards.overview.description",
    icon: BookOpen,
    size: "sm",
    defaultVisible: true,
    href: "/kurslar",
    permission: { definition: coursesPermissions, action: "view" },
    render: async ({ t, user }) => {
      const scope = await teacherCourseScope(user);
      const where = { deletedAt: null, ...(scope ? { id: { in: scope } } : {}) };
      const db = getDb();
      const [active, planned, students] = await Promise.all([
        db.course.count({ where: { ...where, status: "ACTIVE" } }),
        db.course.count({ where: { ...where, status: "PLANNED" } }),
        db.courseEnrollment.count({ where: { status: "ACTIVE", course: { ...where, status: "ACTIVE" } } }),
      ]);
      return (
        <StatCardBody
          value={active}
          label={t("cards.overview.active")}
          details={[
            { label: t("cards.overview.planned"), value: planned },
            { label: t("cards.overview.students"), value: students },
          ]}
        />
      );
    },
  },
  {
    key: "upcomingSessions",
    titleKey: "cards.upcomingSessions.title",
    descriptionKey: "cards.upcomingSessions.description",
    icon: CalendarClock,
    size: "md",
    defaultVisible: true,
    permission: { definition: coursesPermissions, action: "view" },
    render: async ({ t, user }) => {
      const scope = await teacherCourseScope(user);
      const sessions = await getDb().courseSession.findMany({
        where: { isCancelled: false, date: { gte: berlinToday() }, course: { deletedAt: null, ...(scope ? { id: { in: scope } } : {}) } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 5,
        include: { course: { select: { id: true, code: true, title: true } } },
      });
      return (
        <TableCardBody
          emptyText={t("cards.upcomingSessions.empty")}
          columns={[
            { key: "course", label: t("cards.upcomingSessions.colCourse") },
            { key: "date", label: t("cards.upcomingSessions.colDate") },
            { key: "topic", label: t("cards.upcomingSessions.colTopic") },
          ]}
          rows={sessions.map((session) => ({
            id: session.id,
            href: `/kurslar/${session.course.id}?sekme=dersler`,
            cells: {
              course: `${session.course.code} · ${session.course.title}`,
              date: `${formatDate(session.date)}${session.startTime ? ` ${session.startTime}` : ""}`,
              topic: session.topic ?? "—",
            },
          }))}
        />
      );
    },
  },
  {
    key: "openFees",
    titleKey: "cards.openFees.title",
    descriptionKey: "cards.openFees.description",
    icon: Coins,
    size: "sm",
    href: "/kurslar/odemeler",
    permission: { definition: courseFeesPermissions, action: "view" },
    render: async ({ t }) => {
      const db = getDb();
      const base = { status: "OPEN" as const, enrollment: { course: { deletedAt: null } } };
      const [open, overdue] = await Promise.all([
        db.courseCharge.aggregate({ where: base, _sum: { amountCents: true }, _count: true }),
        db.courseCharge.aggregate({ where: { ...base, dueDate: { lt: berlinToday() } }, _sum: { amountCents: true }, _count: true }),
      ]);
      return (
        <StatCardBody
          value={formatMoney(open._sum.amountCents ?? 0)}
          label={t("cards.openFees.open", { count: open._count })}
          tone={overdue._count > 0 ? "danger" : "default"}
          details={[{ label: t("cards.openFees.overdue"), value: `${overdue._count} · ${formatMoney(overdue._sum.amountCents ?? 0)}`, tone: overdue._count > 0 ? "danger" : "default" }]}
        />
      );
    },
  },
]);
