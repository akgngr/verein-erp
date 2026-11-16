import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {proposalAcknowledgementSchema} from "@/shared/ai/dataset";
import {DATE_RE,PROPOSED} from "@/shared/ai/define";
import {can} from "@/shared/permissions/define";
import {meetingsPermissions} from "../permissions";
import {getAiMeetingTarget} from "../queries/ai-target";

/** Server-only proposal definitions; domain actions are invoked only by explicit confirmation. */
export const aiProposalTools=[
aiToolV2({
      name: "propose_meeting",
      operation: "create",
      allowed: (user) => can(user.role, meetingsPermissions, "create"),
      description: "PROPOSES creating a meeting. Date YYYY-MM-DD, time HH:mm. Nothing is created until the user confirms.", // i18n-ignore (model-facing tool text)
      input:(z.object({
        type: z.enum(["BOARD", "GENERAL_ASSEMBLY", "COMMITTEE", "OTHER"]),
        title: z.string().min(3).max(200),
        meetingDate: z.string().regex(DATE_RE),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
        location: z.string().max(200).nullable(),
        description: z.string().max(2000).nullable(),
      })).strict(),
      result:proposalAcknowledgementSchema,modelOutput:proposalAcknowledgementSchema,
      policy:{"purpose":"meetings-proposal","serverReads":[],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async (input, { propose }) => {
        propose({ action: "create", title: input.title, details: [input.type, [input.meetingDate, input.startTime].filter(Boolean).join(" "), input.location ?? ""].filter(Boolean), payload: input });
        return PROPOSED;
      },
    }),
aiToolV2({
      name: "propose_meeting_status",
      operation: "update",
      allowed: (user) => can(user.role, meetingsPermissions, "update"),
      description: "PROPOSES changing a meeting's status (PLANNED, HELD, APPROVED, CANCELLED). A reason (min. 5 chars) is required for cancelling.", // i18n-ignore (model-facing tool text)
      input:(z.object({ meetingId: z.string().min(1).max(100), status: z.enum(["PLANNED", "HELD", "APPROVED", "CANCELLED"]), reason: z.string().max(500).nullable() })).strict(),
      result:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),modelOutput:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),
      policy:{"purpose":"meetings-proposal","serverReads":["Meeting"],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async ({ meetingId, status, reason }, { propose }) => {
        const meeting = await getAiMeetingTarget(meetingId);
        if (!meeting) return { status: "not_found" } as const;
        propose({ action: "changeStatus", title: `${meeting.meetingNumber} – ${meeting.title}`, details: [`→ ${status}`], payload: { meetingId: meeting.id, status, reason } });
        return PROPOSED;
      },
    }),
aiToolV2({
      name: "propose_delete_meeting",
      operation: "delete",
      allowed: (user) => can(user.role, meetingsPermissions, "delete"),
      description: "PROPOSES deleting a meeting (id from list_meetings).", // i18n-ignore (model-facing tool text)
      input:(z.object({ meetingId: z.string().min(1).max(100) })).strict(),
      result:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),modelOutput:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["not_found"])}).strict()]),
      policy:{"purpose":"meetings-proposal","serverReads":["Meeting"],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async ({ meetingId }, { propose }) => {
        const meeting = await getAiMeetingTarget(meetingId);
        if (!meeting) return { status: "not_found" } as const;
        propose({ action: "delete", title: `${meeting.meetingNumber} – ${meeting.title}`, payload: { meetingId: meeting.id } });
        return PROPOSED;
      },
    })
];
