import "server-only";
import {aiProposalTools} from "./services/ai-proposal-tools";

import { z } from "zod";
import {aiListCursor,aiPageInfo} from "@/shared/ai/pagination";

import {DATE_RE, NO_INPUT, aiAction, aiTool, defineModuleAi, euros, isoDay} from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { coursesPermissions } from "./permissions";
import { createCourseAction, deleteCourseAction, getCourse, getCourseStats, listAiCourses, updateCourseAction } from "./server";

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
      schema:z.object({cursor:aiListCursor}),
      inputSchema:{type:"object",properties:{cursor:{type:"string",pattern:"^[1-9][0-9]{0,3}$"}},required:[],additionalProperties:false},
      run:({cursor})=>listAiCourses(cursor),
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
        return { ...stats,courseListPageInfo:aiPageInfo(1,50,Object.values(stats.courses).reduce((total,count)=>total+count,0)), charges: { openEur: euros(stats.charges.openCents), paidEur: euros(stats.charges.paidCents), openCount: stats.charges.openCount } };
      },
    }),
    ...aiProposalTools,

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
      snapshot: (input)=>getCourse(input.courseId),
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
    delete: aiAction({ operation: "delete", snapshot: (input)=>getCourse(input.courseId), schema: z.object({ courseId: z.string().min(1).max(100) }), execute: ({ courseId }) => deleteCourseAction({ id: courseId }) }),
  },
});
