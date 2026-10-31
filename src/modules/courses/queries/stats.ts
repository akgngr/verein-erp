import "server-only";

import { getDb } from "@/shared/db";

/**
 * Kurs istatistikleri — yalnızca sayılar ve tutarlar. KARAR: öğretmen, öğrenci ve veli adı
 * hiçbir alanda dönmez (asistan ve raporlar için).
 */
export async function getCourseStats(): Promise<{
  courses: { planned: number; active: number; completed: number; cancelled: number };
  courseList: { id: string; code: string; title: string; kind: string; status: string; startDate: string; enrollments: number; teachers: number }[];
  activeEnrollments: number;
  upcomingSessions: number;
  charges: { openCents: number; paidCents: number; openCount: number };
}> {
  const db = getDb();
  const now = new Date();
  const [byStatus, courses, activeEnrollments, upcomingSessions, open, paid] = await Promise.all([
    db.course.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
    db.course.findMany({
      where: { deletedAt: null },
      orderBy: { startDate: "desc" },
      take: 50,
      select: { id: true, code: true, title: true, kind: true, status: true, startDate: true, _count: { select: { enrollments: { where: { status: "ACTIVE" } }, teachers: true } } },
    }),
    db.courseEnrollment.count({ where: { status: "ACTIVE", course: { deletedAt: null } } }),
    db.courseSession.count({ where: { date: { gte: now }, isCancelled: false, course: { deletedAt: null } } }),
    db.courseCharge.aggregate({ where: { status: "OPEN" }, _sum: { amountCents: true }, _count: true }),
    db.courseCharge.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true } }),
  ]);
  const count = (status: string) => byStatus.find((row) => row.status === status)?._count ?? 0;
  return {
    courses: { planned: count("PLANNED"), active: count("ACTIVE"), completed: count("COMPLETED"), cancelled: count("CANCELLED") },
    courseList: courses.map((course) => ({
      id: course.id,
      code: course.code,
      title: course.title,
      kind: course.kind,
      status: course.status,
      startDate: course.startDate.toISOString().slice(0, 10),
      enrollments: course._count.enrollments,
      teachers: course._count.teachers,
    })),
    activeEnrollments,
    upcomingSessions,
    charges: { openCents: open._sum.amountCents ?? 0, paidCents: paid._sum.amountCents ?? 0, openCount: open._count },
  };
}
