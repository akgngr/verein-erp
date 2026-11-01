import "server-only";

import type { Prisma } from "@prisma/client";

import { getPaymentProfile } from "@/modules/auth/server";
import { getDb } from "@/shared/db";
import type { ListParams, ListResult } from "@/shared/list-params";

import type { ChargeRow, EnrollmentRow, SessionRow, TeacherRow } from "../types";
import { berlinToday } from "../utils";

export async function listSessions(courseId: string): Promise<SessionRow[]> {
  const rows = await getDb().courseSession.findMany({
    where: { courseId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    include: { teacher: { select: { firstName: true, lastName: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    startTime: row.startTime,
    endTime: row.endTime,
    topic: row.topic,
    teacherId: row.teacherId,
    teacherName: row.teacher ? `${row.teacher.firstName} ${row.teacher.lastName}`.trim() : null,
    isCancelled: row.isCancelled,
    note: row.note,
  }));
}

export async function listEnrollments(courseId: string): Promise<EnrollmentRow[]> {
  const rows = await getDb().courseEnrollment.findMany({
    where: { courseId },
    orderBy: [{ status: "asc" }, { studentLabel: "asc" }],
    include: { charges: { where: { status: "OPEN" }, select: { amountCents: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    studentId: row.studentId,
    studentLabel: row.studentLabel,
    studentNumber: row.studentNumber,
    payerLabel: row.payerLabel,
    payerDebtorNumber: row.payerDebtorNumber,
    enrolledAt: row.enrolledAt,
    status: row.status,
    discountPercent: row.discountPercent,
    note: row.note,
    openCents: row.charges.reduce((sum, charge) => sum + charge.amountCents, 0),
  }));
}

export const CHARGE_SORTABLE_FIELDS = ["dueDate", "amountCents"] as const;
export type ChargeListFilterKeys = "status" | "overdue" | "courseId";

/** Ücret kalemleri (tüm kurslar ya da bir kurs). Varsayılan: açık kalemler. */
export async function listCharges(params: ListParams<ChargeListFilterKeys>): Promise<ListResult<ChargeRow> & { openTotalCents: number }> {
  const today = berlinToday();
  const status = params.filters.status ?? "OPEN";
  const where: Prisma.CourseChargeWhereInput = {
    enrollment: { course: { deletedAt: null, ...(params.filters.courseId ? { id: params.filters.courseId } : {}) } },
    ...(status !== "ALL" ? { status: status as Prisma.EnumCourseChargeStatusFilter["equals"] } : {}),
    ...(params.filters.overdue === "1" ? { status: "OPEN", dueDate: { lt: today } } : {}),
    ...(params.q
      ? {
          OR: [
            { enrollment: { studentLabel: { contains: params.q, mode: "insensitive" } } },
            { enrollment: { payerLabel: { contains: params.q, mode: "insensitive" } } },
            { enrollment: { course: { code: { contains: params.q, mode: "insensitive" } } } },
            ...(/^\d+$/.test(params.q) ? [{ enrollment: { payerDebtorNumber: Number(params.q) } }] : []),
          ],
        }
      : {}),
  };
  const db = getDb();
  const [rows, total, open] = await Promise.all([
    db.courseCharge.findMany({
      where,
      orderBy: [{ [params.sort]: params.dir }, { sequence: "asc" }],
      skip: params.skip,
      take: params.take,
      include: {
        enrollment: { include: { course: { select: { id: true, code: true, title: true } } } },
        payments: { where: { reversedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    db.courseCharge.count({ where }),
    db.courseCharge.aggregate({ where: { ...where, status: "OPEN" }, _sum: { amountCents: true } }),
  ]);
  return {
    rows: rows.map((row) => toChargeRow(row, today)),
    total,
    page: params.page,
    pageSize: params.pageSize,
    openTotalCents: open._sum.amountCents ?? 0,
  };
}

type ChargeWithRelations = Prisma.CourseChargeGetPayload<{
  include: { enrollment: { include: { course: { select: { id: true; code: true; title: true } } } }; payments: true };
}>;

function toChargeRow(row: ChargeWithRelations, today: Date): ChargeRow {
  const payment = row.payments[0];
  return {
    id: row.id,
    enrollmentId: row.enrollmentId,
    courseId: row.enrollment.course.id,
    courseCode: row.enrollment.course.code,
    courseTitle: row.enrollment.course.title,
    studentLabel: row.enrollment.studentLabel,
    payerLabel: row.enrollment.payerLabel,
    payerDebtorNumber: row.enrollment.payerDebtorNumber,
    kind: row.kind,
    sequence: row.sequence,
    total: row.total,
    period: row.period,
    dueDate: row.dueDate,
    amountCents: row.amountCents,
    status: row.status,
    isOverdue: row.status === "OPEN" && row.dueDate < today,
    payment: payment ? { id: payment.id, paidAt: payment.paidAt, method: payment.method, bookingNumber: payment.bookingNumber } : null,
  };
}

export async function listTeachers(): Promise<TeacherRow[]> {
  const rows = await getDb().courseTeacher.findMany({
    orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    include: { _count: { select: { courses: true } } },
  });
  const withProfile = await teachersWithPaymentProfile(rows.map((row) => row.userId));
  return rows.map((row) => toTeacherRow(row, withProfile));
}

/** Profilinde IBAN kayıtlı öğretmen hesapları (IBAN'ın kendisi bu modülde tutulmaz/dönmez). */
async function teachersWithPaymentProfile(userIds: (string | null)[]): Promise<Set<string>> {
  const result = new Set<string>();
  for (const userId of userIds) {
    if (userId && (await getPaymentProfile(userId))?.iban) result.add(userId);
  }
  return result;
}

function toTeacherRow(row: Prisma.CourseTeacherGetPayload<{ include: { _count: { select: { courses: true } } } }>, withProfile: Set<string>): TeacherRow { // i18n-ignore (tip imzası)
  return {
    id: row.id,
    userId: row.userId,
    firstName: row.firstName,
    lastName: row.lastName,
    email: row.email,
    phone: row.phone,
    subjects: row.subjects,
    note: row.note,
    isActive: row.isActive,
    courseCount: row._count.courses,
    compensation: row.compensation,
    rateCents: row.rateCents,
    rateUnit: row.rateUnit,
    hasPaymentProfile: Boolean(row.userId && withProfile.has(row.userId)),
  };
}

export async function getTeacher(id: string): Promise<TeacherRow | null> {
  const row = await getDb().courseTeacher.findUnique({ where: { id }, include: { _count: { select: { courses: true } } } });
  return row ? toTeacherRow(row, await teachersWithPaymentProfile([row.userId])) : null;
}

export async function listTeacherOptions(): Promise<{ id: string; label: string }[]> {
  const rows = await getDb().courseTeacher.findMany({
    where: { isActive: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true, subjects: true },
  });
  return rows.map((row) => ({ id: row.id, label: `${`${row.firstName} ${row.lastName}`.trim()}${row.subjects ? ` (${row.subjects})` : ""}` }));
}

export type CoursesSettingsData = {
  incomeCategoryId: string;
  payoutCategoryId: string;
  defaultSessionMinutes: number;
  uebungsleiterLimitCents: number;
  ehrenamtLimitCents: number;
};

export async function getCoursesSettings(): Promise<CoursesSettingsData> {
  const row = await getDb().coursesSettings.findUnique({ where: { id: "singleton" } });
  return {
    incomeCategoryId: row?.incomeCategoryId ?? "",
    payoutCategoryId: row?.payoutCategoryId ?? "",
    defaultSessionMinutes: row?.defaultSessionMinutes ?? 60,
    uebungsleiterLimitCents: row?.uebungsleiterLimitCents ?? 330000,
    ehrenamtLimitCents: row?.ehrenamtLimitCents ?? 96000,
  };
}
