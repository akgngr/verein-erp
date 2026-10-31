import "server-only";

import { z } from "zod";

import { DATE_RE, NO_INPUT, PROPOSED, aiAction, aiTool, defineModuleAi, euros, isoDay } from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { coursesPermissions } from "./permissions";
import { createCourseAction, deleteCourseAction, getCourse, getCourseStats, listCourseOptions, updateCourseAction } from "./server";

/** Kurslar: yalnızca istatistik; öğretmen, öğrenci ve veli adı dönmez. Sözleşme: src/shared/ai/define.ts. */
const STATUS = z.enum(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]);
const createSchema = z.object({
  kind: z.enum(["COURSE", "TUTORING"]),
  title: z.string().min(2).max(150),
  subject: z.string().max(80).nullable(),
  startDate: z.string().regex(DATE_RE),
  endDate: z.string().regex(DATE_RE).nullable(),
  description: z.string().max(2000).nullable(),
});

export const ai = defineModuleAi({
  module: "courses",
  tools: [
    aiTool({
      name: "list_courses",
      operation: "read",
      allowed: (user) => can(user.role, coursesPermissions, "view"),
      description: "Courses: code, title and status. No student data.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      run: async () => (await listCourseOptions(null)).map((course) => ({ course: course.label, status: course.status })),
    }),
    aiTool({
      name: "get_course_statistics",
      operation: "read",
      allowed: (user) => can(user.role, coursesPermissions, "view"),
      description: "Course statistics: courses by status, list of courses (id, code, title, kind, status, start date, number of active enrolments and teachers), active enrolments, upcoming sessions, open/paid fees (EUR). No teacher, student or guardian names.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: NO_INPUT,
      run: async () => {
        const stats = await getCourseStats();
        return { ...stats, charges: { openEur: euros(stats.charges.openCents), paidEur: euros(stats.charges.paidCents), openCount: stats.charges.openCount } };
      },
    }),
    aiTool({
      name: "propose_course",
      operation: "create",
      allowed: (user) => can(user.role, coursesPermissions, "create"),
      description: "PROPOSES creating a free course in PLANNED status (fees and teachers are set later in the course form). Dates YYYY-MM-DD.", // i18n-ignore (model-facing tool text)
      schema: z.object({
        kind: z.enum(["COURSE", "TUTORING"]),
        title: z.string().min(2).max(150),
        subject: z.string().max(80).nullable(),
        startDate: z.string().regex(DATE_RE),
        endDate: z.string().regex(DATE_RE).nullable(),
        description: z.string().max(2000).nullable(),
      }),
      inputSchema: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["COURSE", "TUTORING"] },
          title: { type: "string" },
          subject: { type: ["string", "null"] },
          startDate: { type: "string" },
          endDate: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
        },
        required: ["kind", "title", "subject", "startDate", "endDate", "description"],
        additionalProperties: false,
      },
      run: async ({ kind, ...rest }, { propose }) => {
        propose({ action: "create", title: rest.title, details: [kind, [rest.startDate, rest.endDate].filter(Boolean).join(" – ")].filter(Boolean), payload: { kind, ...rest } });
        return PROPOSED;
      },
    }),
    aiTool({
      name: "propose_course_status",
      operation: "update",
      allowed: (user) => can(user.role, coursesPermissions, "update"),
      description: "PROPOSES changing a course's status (id from get_course_statistics).", // i18n-ignore (model-facing tool text)
      schema: z.object({ courseId: z.string().min(1).max(100), status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]) }),
      inputSchema: {
        type: "object",
        properties: { courseId: { type: "string" }, status: { type: "string", enum: ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"] } },
        required: ["courseId", "status"],
        additionalProperties: false,
      },
      run: async ({ courseId, status }, { propose }) => {
        const course = await getCourse(courseId);
        if (!course) return { status: "not_found" };
        propose({ action: "changeStatus", title: `${course.code} – ${course.title}`, details: [`→ ${status}`], payload: { courseId: course.id, status } });
        return PROPOSED;
      },
    }),
    aiTool({
      name: "propose_delete_course",
      operation: "delete",
      allowed: (user) => can(user.role, coursesPermissions, "delete"),
      description: "PROPOSES deleting a course (id from get_course_statistics).", // i18n-ignore (model-facing tool text)
      schema: z.object({ courseId: z.string().min(1).max(100) }),
      inputSchema: { type: "object", properties: { courseId: { type: "string" } }, required: ["courseId"], additionalProperties: false },
      run: async ({ courseId }, { propose }) => {
        const course = await getCourse(courseId);
        if (!course) return { status: "not_found" };
        propose({ action: "delete", title: `${course.code} – ${course.title}`, payload: { courseId: course.id } });
        return PROPOSED;
      },
    }),
  ],
  actions: {
    create: aiAction({
      operation: "create",
      schema: createSchema,
      // Ücretsiz ve PLANLANAN kurs; ücret ve öğretmenler sonra kurs formunda girilir.
      execute: (input) =>
        createCourseAction({
          kind: input.kind,
          title: input.title,
          subject: input.subject ?? "",
          description: input.description ?? "",
          level: "",
          location: "",
          scheduleNote: "",
          startDate: input.startDate,
          endDate: input.endDate ?? "",
          capacity: "",
          feeType: "FREE",
          fee: "",
          installmentCount: "",
          status: "PLANNED",
          teacherIds: [],
        }),
    }),
    changeStatus: aiAction({
      operation: "update",
      schema: z.object({ courseId: z.string().min(1).max(100), status: STATUS }),
      execute: async ({ courseId, status }) => {
        // Kurs güncellemesi tam form ister: mevcut değerler korunur, yalnızca durum değişir.
        const course = await getCourse(courseId);
        if (!course) return { ok: false, error: "courses.errors.notFound" };
        return updateCourseAction({
          id: course.id,
          kind: course.kind,
          title: course.title,
          subject: course.subject ?? "",
          description: course.description ?? "",
          level: course.level ?? "",
          location: course.location ?? "",
          scheduleNote: course.scheduleNote ?? "",
          startDate: isoDay(course.startDate) ?? "",
          endDate: isoDay(course.endDate) ?? "",
          capacity: course.capacity ? String(course.capacity) : "",
          feeType: course.feeType,
          fee: course.feeCents ? (course.feeCents / 100).toFixed(2).replace(".", ",") : "",
          installmentCount: course.installmentCount ? String(course.installmentCount) : "",
          status,
          teacherIds: course.teacherIds,
        });
      },
    }),
    delete: aiAction({ operation: "delete", schema: z.object({ courseId: z.string().min(1).max(100) }), execute: ({ courseId }) => deleteCourseAction({ id: courseId }) }),
  },
});
