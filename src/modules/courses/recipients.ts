import "server-only";

import type { CourseEnrollmentStatus } from "@prisma/client";

import {
  listActiveStudentIds,
  listGuardianContactsForStudents,
  type GuardianContactRecord,
} from "@/modules/students/server";
import { getDb } from "@/shared/db";
import { defineRecipients, type Recipient } from "@/shared/mailings/define";

import { coursesPermissions } from "./permissions";

const ENROLLMENT_STATUSES: readonly CourseEnrollmentStatus[] = [
  "ACTIVE",
  "COMPLETED",
  "WITHDRAWN",
];
const isEnrollmentStatus = (value: string): value is CourseEnrollmentStatus =>
  (ENROLLMENT_STATUSES as readonly string[]).includes(value);
const GUARDIAN_ROLES = ["ALL_GUARDIANS", "PAYER_ONLY"];

/** Seçim listesi etiketi = değer: "K-2026-01 · Matematik 5" (kişi verisi yok). */
export const courseLabel = (row: { code: string; title: string }) =>
  `${row.code} · ${row.title}`.slice(0, 48);

export interface CourseEnrollmentForRecipients {
  courseId: string;
  studentId: string;
  studentLabel: string;
  payerGuardianId: string | null;
}

/**
 * Pure recipient builder shared with unit tests:
 * resolves guardians for enrolled students, honors `PAYER_ONLY` vs `ALL_GUARDIANS`,
 * deduplicates multi-child families (by guardian ID), and preserves
 * `bulkMailOptOut` + `messagingConsents`. Enrollments of students outside
 * `activeStudentIds` (soft-deleted) are skipped, including their stored payer.
 */
export function buildCourseGuardianRecipients(input: {
  courses: ReadonlyArray<{ id: string; code: string; title: string }>;
  enrollments: ReadonlyArray<CourseEnrollmentForRecipients>;
  activeStudentIds: ReadonlySet<string>;
  guardiansById: ReadonlyMap<string, GuardianContactRecord>;
  linksByStudentId: ReadonlyMap<string, ReadonlyArray<{ guardianId: string; isPayer: boolean }>>;
  payerOnly: boolean;
}): Recipient[] {
  const courseMap = new Map(input.courses.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const result: Recipient[] = [];

  for (const enrollment of input.enrollments) {
    if (!input.activeStudentIds.has(enrollment.studentId)) continue;
    const course = courseMap.get(enrollment.courseId);
    if (!course) continue;

    const studentLinks = input.linksByStudentId.get(enrollment.studentId) ?? [];
    const targetGuardianIds = new Set<string>();

    if (input.payerOnly) {
      if (enrollment.payerGuardianId) {
        targetGuardianIds.add(enrollment.payerGuardianId);
      } else {
        for (const link of studentLinks) {
          if (link.isPayer) targetGuardianIds.add(link.guardianId);
        }
      }
    } else {
      if (enrollment.payerGuardianId) targetGuardianIds.add(enrollment.payerGuardianId);
      for (const link of studentLinks) targetGuardianIds.add(link.guardianId);
    }

    for (const guardianId of targetGuardianIds) {
      const guardian = input.guardiansById.get(guardianId);
      if (!guardian || seen.has(guardian.id)) continue;
      // Only the guardian is deduplicated here: two guardians sharing an email can still have
      // their own phone and consents. The campaign pipeline deduplicates per channel address.
      seen.add(guardian.id);
      const email = guardian.email?.trim().toLowerCase() || null;

      const fullName = `${guardian.firstName} ${guardian.lastName}`.trim();
      result.push({
        id: guardian.id,
        email,
        phone: guardian.phone,
        consents: Object.fromEntries(
          guardian.messagingConsents.map((channel) => [channel, true]),
        ),
        name: fullName,
        optOut: guardian.bulkMailOptOut,
        vars: {
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          fullName,
          salutation: guardian.salutation ?? "",
          courseCode: course.code,
          courseTitle: course.title,
          studentName: enrollment.studentLabel,
        },
      });
    }
  }

  return result;
}

/**
 * Kurs bazlı veli alıcı kaynağı: seçilen kurslardaki öğrencilerin velilerine
 * hedefli kampanya duyurusu (opt-out ve kanal izinleri korunur).
 */
export const recipients = defineRecipients("courses", [
  {
    key: "guardians",
    permission: { definition: coursesPermissions, action: "view" },
    placeholders: [
      "firstName",
      "lastName",
      "fullName",
      "salutation",
      "courseCode",
      "courseTitle",
      "studentName",
    ],
    filters: [
      {
        key: "course",
        options: [],
        loadOptions: async () =>
          (
            await getDb().course.findMany({
              where: { deletedAt: null, status: { not: "CANCELLED" } },
              select: { code: true, title: true },
              orderBy: [{ startDate: "desc" }, { code: "asc" }],
              take: 80,
            })
          ).map(courseLabel),
      },
      {
        key: "status",
        options: [...ENROLLMENT_STATUSES],
        defaults: ["ACTIVE"],
      },
      {
        key: "role",
        options: GUARDIAN_ROLES,
        defaults: ["ALL_GUARDIANS"],
      },
    ],
    sampleVars: {
      firstName: "Ayşe",
      lastName: "Örnek",
      fullName: "Ayşe Örnek",
      salutation: "Frau",
      courseCode: "K-2026-01",
      courseTitle: "Mathematik 5. Klasse",
      studentName: "Emre Örnek",
    },
    resolve: async (filter) => {
      const labels = new Set((filter.course ?? []).slice(0, 80));
      if (!labels.size) return [];

      const statuses = (filter.status ?? []).filter(isEnrollmentStatus);
      const selectedRoles = filter.role ?? [];
      const payerOnly =
        selectedRoles.includes("PAYER_ONLY") &&
        !selectedRoles.includes("ALL_GUARDIANS");

      const courses = (
        await getDb().course.findMany({
          where: { deletedAt: null },
          select: { id: true, code: true, title: true },
          orderBy: [{ startDate: "desc" }, { code: "asc" }],
          take: 300,
        })
      ).filter((row) => labels.has(courseLabel(row)));

      if (courses.length === 0) return [];

      const enrollments = await getDb().courseEnrollment.findMany({
        where: {
          courseId: { in: courses.map((c) => c.id) },
          ...(statuses.length ? { status: { in: statuses } } : {}),
        },
        select: {
          courseId: true,
          studentId: true,
          studentLabel: true,
          payerGuardianId: true,
        },
        orderBy: [{ studentLabel: "asc" }],
      });

      if (enrollments.length === 0) return [];

      // Enrollments keep the student ID and payer without a foreign key, so a
      // soft-deleted student's family must be dropped before payer IDs are collected.
      const activeStudentIds = await listActiveStudentIds(enrollments.map((e) => e.studentId));
      const activeEnrollments = enrollments.filter((e) => activeStudentIds.has(e.studentId));
      if (activeEnrollments.length === 0) return [];

      const { guardiansById, linksByStudentId } =
        await listGuardianContactsForStudents(
          activeEnrollments.map((e) => e.studentId),
          activeEnrollments.flatMap((e) => (e.payerGuardianId ? [e.payerGuardianId] : [])),
        );

      return buildCourseGuardianRecipients({
        courses,
        enrollments: activeEnrollments,
        activeStudentIds,
        guardiansById,
        linksByStudentId,
        payerOnly,
      });
    },
  },
]);
