import "server-only";

import type { Prisma } from "@prisma/client";

import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { CourseDetail, CourseRoster, CourseRow } from "../types";

export const COURSE_SORTABLE_FIELDS = ["code", "title", "startDate", "updatedAt"] as const;
export const COURSE_DEFAULT_SORT = "startDate";
export type CourseListFilterKeys = "status" | "kind";

const teacherName = (teacher: { firstName: string; lastName: string }) => `${teacher.firstName} ${teacher.lastName}`;

/** Kurs listesi; `scope` (öğretmen) verilirse yalnızca o kurslar. */
export async function listCourses(params: ListParams<CourseListFilterKeys>, scope: string[] | null): Promise<ListResult<CourseRow>> {
  const where: Prisma.CourseWhereInput = {
    deletedAt: null,
    ...(scope ? { id: { in: scope } } : {}),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q, mode: "insensitive" } },
            { code: { contains: params.q, mode: "insensitive" } },
            { subject: { contains: params.q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(params.filters.status ? { status: params.filters.status as Prisma.EnumCourseStatusFilter["equals"] } : {}),
    ...(params.filters.kind ? { kind: params.filters.kind as Prisma.EnumCourseKindFilter["equals"] } : {}),
  };
  const db = getDb();
  const [rows, total] = await Promise.all([
    db.course.findMany({
      where,
      orderBy: { [params.sort]: params.dir },
      skip: params.skip,
      take: params.take,
      include: {
        teachers: { include: { teacher: { select: { firstName: true, lastName: true } } } },
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
    }),
    db.course.count({ where }),
  ]);
  return {
    rows: rows.map((row) => ({
      id: row.id,
      code: row.code,
      kind: row.kind,
      title: row.title,
      subject: row.subject,
      startDate: row.startDate,
      endDate: row.endDate,
      feeType: row.feeType,
      feeCents: row.feeCents,
      status: row.status,
      capacity: row.capacity,
      enrolledCount: row._count.enrollments,
      teacherNames: row.teachers.map((link) => teacherName(link.teacher)),
    })),
    total,
    page: params.page,
    pageSize: params.pageSize,
  };
}

export async function getCourse(id: string): Promise<CourseDetail | null> {
  const row = await getDb().course.findFirst({
    where: { id, deletedAt: null },
    include: { teachers: { include: { teacher: { select: { id: true, firstName: true, lastName: true } } } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    title: row.title,
    subject: row.subject,
    description: row.description,
    level: row.level,
    location: row.location,
    scheduleNote: row.scheduleNote,
    startDate: row.startDate,
    endDate: row.endDate,
    capacity: row.capacity,
    feeType: row.feeType,
    feeCents: row.feeCents,
    installmentCount: row.installmentCount,
    status: row.status,
    createdByLabel: row.createdByLabel,
    teacherIds: row.teachers.map((link) => link.teacherId),
    teachers: row.teachers.map((link) => ({ id: link.teacher.id, name: teacherName(link.teacher) })),
  };
}

/** Öğrenci takibi için: kurs, oturumlar ve kayıtlar (izin/kapsam denetimi çağıranda). */
export async function getCourseRoster(courseId: string): Promise<CourseRoster | null> {
  const course = await getDb().course.findFirst({
    where: { id: courseId, deletedAt: null },
    include: {
      sessions: { orderBy: [{ date: "asc" }, { startTime: "asc" }] },
      enrollments: { orderBy: { studentLabel: "asc" } },
      teachers: { include: { teacher: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!course) return null;
  return {
    course: { id: course.id, code: course.code, title: course.title, kind: course.kind, startDate: course.startDate, endDate: course.endDate },
    sessions: course.sessions.map((session) => ({
      id: session.id,
      date: session.date,
      startTime: session.startTime,
      topic: session.topic,
      isCancelled: session.isCancelled,
    })),
    enrollments: course.enrollments.map((enrollment) => ({
      id: enrollment.id,
      studentId: enrollment.studentId,
      studentLabel: enrollment.studentLabel,
      studentNumber: enrollment.studentNumber,
      status: enrollment.status,
    })),
    teacherNames: course.teachers.map((link) => teacherName(link.teacher)),
  };
}

/** Seçim listesi (öğrenci takibi): kapsamdaki aktif/planlı kurslar. */
export async function listCourseOptions(scope: string[] | null): Promise<{ id: string; label: string; status: string }[]> {
  const rows = await getDb().course.findMany({
    where: { deletedAt: null, ...(scope ? { id: { in: scope } } : {}) },
    select: { id: true, code: true, title: true, status: true },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });
  return rows.map((row) => ({ id: row.id, label: `${row.code} · ${row.title}`, status: row.status }));
}
