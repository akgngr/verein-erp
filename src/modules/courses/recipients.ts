import { listGuardianContactsForStudents } from "@/modules/students/server";

import { getDb } from "@/shared/db";
import { defineRecipients, type Recipient } from "@/shared/mailings/define";

import { coursesPermissions } from "./permissions";

function extractCourseCode(option: string): string {
  const sep = option.indexOf(" — ");
  return (sep === -1 ? option : option.slice(0, sep)).trim();
}

export const recipients = defineRecipients("courses", [
  {
    key: "courseGuardians",
    permission: { definition: coursesPermissions, action: "view" },
    placeholders: ["firstName", "lastName", "fullName", "salutation", "courseTitle"],
    filters: [
      {
        key: "course",
        options: [],
        loadOptions: async () => {
          const courses = await getDb().course.findMany({
            where: { deletedAt: null, status: { in: ["PLANNED", "ACTIVE", "COMPLETED"] } },
            select: { code: true, title: true },
            orderBy: [{ status: "asc" }, { code: "desc" }],
          });
          return courses.map((c) => `${c.code} — ${c.title}`);
        },
      },
      {
        key: "status",
        options: ["ACTIVE", "COMPLETED", "WITHDRAWN"],
        defaults: ["ACTIVE"],
      },
      {
        key: "role",
        options: ["PAYER_ONLY", "ALL_GUARDIANS"],
        defaults: ["PAYER_ONLY"],
      },
    ],
    sampleVars: {
      firstName: "Clara",
      lastName: "Beispiel",
      fullName: "Clara Beispiel",
      salutation: "Frau",
      courseTitle: "Matematik Nachhilfe",
    },
    resolve: async (filter) => {
      const selectedCourses = filter.course ?? [];
      const codes = selectedCourses.map(extractCourseCode).filter(Boolean);
      const statuses = (filter.status?.length ? filter.status : ["ACTIVE"]) as (
        | "ACTIVE"
        | "COMPLETED"
        | "WITHDRAWN"
      )[];
      const payerOnly = !filter.role?.includes("ALL_GUARDIANS");

      const enrollments = await getDb().courseEnrollment.findMany({
        where: {
          status: { in: statuses },
          course: {
            deletedAt: null,
            ...(codes.length > 0 ? { code: { in: codes } } : {}),
          },
        },
        select: {
          studentId: true,
          course: { select: { title: true } },
        },
      });
      if (enrollments.length === 0) return [];

      const courseTitleByStudent = new Map<string, string>();
      for (const e of enrollments) {
        if (!courseTitleByStudent.has(e.studentId)) {
          courseTitleByStudent.set(e.studentId, e.course.title);
        }
      }

      const contacts = await listGuardianContactsForStudents(
        enrollments.map((e) => e.studentId),
        { payerOnly },
      );

      const seenGuardianIds = new Set<string>();
      const list: Recipient[] = [];
      for (const g of contacts) {
        if (seenGuardianIds.has(g.id)) continue;
        seenGuardianIds.add(g.id);
        const fullName = `${g.firstName} ${g.lastName}`.trim();
        const consents: Partial<Record<string, boolean>> = {};
        for (const channel of g.messagingConsents) consents[channel] = true;
        list.push({
          id: g.id,
          email: g.email,
          name: fullName,
          optOut: g.bulkMailOptOut,
          phone: g.phone,
          consents,
          vars: {
            firstName: g.firstName,
            lastName: g.lastName,
            fullName,
            salutation: g.salutation ?? "",
            courseTitle: courseTitleByStudent.get(g.studentId) ?? "",
          },
        });
      }
      return list;
    },
  },
]);
