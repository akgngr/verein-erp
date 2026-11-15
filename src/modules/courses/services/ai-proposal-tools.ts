import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {proposalAcknowledgementSchema} from "@/shared/ai/dataset";
import {DATE_RE,PROPOSED} from "@/shared/ai/define";
import {can} from "@/shared/permissions/define";
import {coursesPermissions} from "../permissions";
import {getAiCourseTarget} from "../queries/ai-target";

/** Server-only proposal definitions; domain actions are invoked only by explicit confirmation. */
export const aiProposalTools=[
aiToolV2({
      name: "propose_course",
      operation: "create",
      allowed: (user) => can(user.role, coursesPermissions, "create"),
      description: "PROPOSES creating a free course in PLANNED status (fees and teachers are set later in the course form). Dates YYYY-MM-DD.", // i18n-ignore (model-facing tool text)
      input:(z.object({
        kind: z.enum(["COURSE", "TUTORING"]),
        title: z.string().min(2).max(150),
        subject: z.string().max(80).nullable(),
        startDate: z.string().regex(DATE_RE),
        endDate: z.string().regex(DATE_RE).nullable(),
        description: z.string().max(2000).nullable(),
      })).strict(),
      result:proposalAcknowledgementSchema,modelOutput:proposalAcknowledgementSchema,
      policy:{"purpose":"courses-proposal","serverReads":[],"modelFields":["status","note"],"processing":"local_only"},projectForModel:result=>result,
      run: async ({ kind, ...rest }, { propose }) => {
        propose({ action: "create", title: rest.title, details: [kind, [rest.startDate, rest.endDate].filter(Boolean).join(" – ")].filter(Boolean), payload: { kind, ...rest } });
        return PROPOSED;
      },
    }),
aiToolV2({
      name: "propose_course_status",
      operation: "update",
      allowed: (user) => can(user.role, coursesPermissions, "update"),
      description: "PROPOSES changing a course's status (id from get_course_statistics).", // i18n-ignore (model-facing tool text)
      input:(z.object({ courseId: z.string().min(1).max(100), status: z.enum(["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"]) })).strict(),
      result:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),modelOutput:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),
      policy:{"purpose":"courses-proposal","serverReads":["Course"],"modelFields":["status","note"],"processing":"local_only"},projectForModel:result=>result,
      run: async ({ courseId, status }, { propose }) => {
        const course = await getAiCourseTarget(courseId);
        if (!course) return { status: "not_found" } as const;
        propose({ action: "changeStatus", title: `${course.code} – ${course.title}`, details: [`→ ${status}`], payload: { courseId: course.id, status } });
        return PROPOSED;
      },
    }),
aiToolV2({
      name: "propose_delete_course",
      operation: "delete",
      allowed: (user) => can(user.role, coursesPermissions, "delete"),
      description: "PROPOSES deleting a course (id from get_course_statistics).", // i18n-ignore (model-facing tool text)
      input:(z.object({ courseId: z.string().min(1).max(100) })).strict(),
      result:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),modelOutput:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),
      policy:{"purpose":"courses-proposal","serverReads":["Course"],"modelFields":["status","note"],"processing":"local_only"},projectForModel:result=>result,
      run: async ({ courseId }, { propose }) => {
        const course = await getAiCourseTarget(courseId);
        if (!course) return { status: "not_found" } as const;
        propose({ action: "delete", title: `${course.code} – ${course.title}`, payload: { courseId: course.id } });
        return PROPOSED;
      },
    })
];
