import "server-only";

import { z } from "zod";

import { DATE_RE, PROPOSED, aiAction, aiTool, defineModuleAi, isoDay } from "@/shared/ai/define";
import { parseListParams } from "@/shared/list-params";
import { can } from "@/shared/permissions/define";

import { meetingsPermissions } from "./permissions";
import { changeMeetingStatusAction, createMeetingAction, deleteMeetingAction, getMeeting, getMeetingStats, listMeetings, MEETING_DEFAULT_SORT, MEETING_SORTABLE_FIELDS } from "./server";

/** Toplantılar: katılımcı listesi dönmez. Sözleşme: src/shared/ai/define.ts. */
const STATUS = z.enum(["PLANNED", "HELD", "APPROVED", "CANCELLED"]);
const createSchema = z.object({
  type: z.enum(["BOARD", "GENERAL_ASSEMBLY", "COMMITTEE", "OTHER"]),
  title: z.string().min(3).max(200),
  meetingDate: z.string().regex(DATE_RE),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  location: z.string().max(200).nullable(),
  description: z.string().max(2000).nullable(),
});

export const ai = defineModuleAi({
  module: "meetings",
  tools: [
    aiTool({
      name: "get_meeting_statistics",
      operation: "read",
      allowed: (user) => can(user.role, meetingsPermissions, "view"),
      description: "Meeting statistics: planned meetings, next meeting (number, title, date), draft minutes, open and overdue action items. No attendee names.", // i18n-ignore (model-facing tool text)
      schema: z.object({}),
      inputSchema: { type: "object", properties: {}, required: [], additionalProperties: false },
      run: async () => {
        const stats = await getMeetingStats();
        return { ...stats, nextMeeting: stats.nextMeeting ? { number: stats.nextMeeting.meetingNumber, title: stats.nextMeeting.title, date: stats.nextMeeting.meetingDate.toISOString() } : null };
      },
    }),
    aiTool({
      name: "list_meetings",
      operation: "read",
      allowed: (user) => can(user.role, meetingsPermissions, "view"),
      description: "Lists meetings (newest first): id, number, type, title, date, time, location, status, decision and open action item counts. Optional date range YYYY-MM-DD.", // i18n-ignore (model-facing tool text)
      schema: z.object({ from: z.string().regex(DATE_RE).nullable(), to: z.string().regex(DATE_RE).nullable() }),
      inputSchema: { type: "object", properties: { from: { type: ["string", "null"] }, to: { type: ["string", "null"] } }, required: ["from", "to"], additionalProperties: false },
      run: async ({ from, to }) => {
        const params = parseListParams(
          { pageSize: "50", ...(from ? { from } : {}), ...(to ? { to } : {}) },
          { sortableFields: MEETING_SORTABLE_FIELDS, defaultSort: MEETING_DEFAULT_SORT, defaultDir: "desc", filterKeys: ["type", "status", "from", "to"] },
        );
        const result = await listMeetings(params);
        return result.rows.map((row) => ({ id: row.id, number: row.meetingNumber, type: row.type, title: row.title, date: isoDay(row.meetingDate), startTime: row.startTime, location: row.location, status: row.status, decisions: row.decisionCount, openActionItems: row.openActionItemCount }));
      },
    }),
    aiTool({
      name: "get_meeting",
      operation: "read",
      allowed: (user) => can(user.role, meetingsPermissions, "view"),
      description: "One meeting's agenda (titles, descriptions, discussion notes) and decisions (text, result, votes). Attendee names are not included.", // i18n-ignore (model-facing tool text)
      schema: z.object({ meetingId: z.string().min(1).max(100) }),
      inputSchema: { type: "object", properties: { meetingId: { type: "string" } }, required: ["meetingId"], additionalProperties: false },
      run: async ({ meetingId }) => {
        const meeting = await getMeeting(meetingId);
        if (!meeting) return { status: "not_found" };
        return {
          number: meeting.meetingNumber,
          type: meeting.type,
          title: meeting.title,
          date: isoDay(meeting.meetingDate),
          status: meeting.status,
          attendeeCount: meeting.attendees.length,
          agenda: meeting.agendaItems.map((item) => ({ position: item.position, title: item.title, description: item.description, discussion: item.discussion })),
          decisions: meeting.decisions.map((decision) => ({ number: decision.decisionNumber, text: decision.text, result: decision.result, agendaItem: decision.agendaItemTitle, votesFor: decision.votesFor, votesAgainst: decision.votesAgainst, votesAbstain: decision.votesAbstain })),
        };
      },
    }),
    aiTool({
      name: "propose_meeting",
      operation: "create",
      allowed: (user) => can(user.role, meetingsPermissions, "create"),
      description: "PROPOSES creating a meeting. Date YYYY-MM-DD, time HH:mm. Nothing is created until the user confirms.", // i18n-ignore (model-facing tool text)
      schema: z.object({
        type: z.enum(["BOARD", "GENERAL_ASSEMBLY", "COMMITTEE", "OTHER"]),
        title: z.string().min(3).max(200),
        meetingDate: z.string().regex(DATE_RE),
        startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
        location: z.string().max(200).nullable(),
        description: z.string().max(2000).nullable(),
      }),
      inputSchema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["BOARD", "GENERAL_ASSEMBLY", "COMMITTEE", "OTHER"] },
          title: { type: "string" },
          meetingDate: { type: "string" },
          startTime: { type: ["string", "null"] },
          location: { type: ["string", "null"] },
          description: { type: ["string", "null"] },
        },
        required: ["type", "title", "meetingDate", "startTime", "location", "description"],
        additionalProperties: false,
      },
      run: async (input, { propose }) => {
        propose({ action: "create", title: input.title, details: [input.type, [input.meetingDate, input.startTime].filter(Boolean).join(" "), input.location ?? ""].filter(Boolean), payload: input });
        return PROPOSED;
      },
    }),
    aiTool({
      name: "propose_meeting_status",
      operation: "update",
      allowed: (user) => can(user.role, meetingsPermissions, "update"),
      description: "PROPOSES changing a meeting's status (PLANNED, HELD, APPROVED, CANCELLED). A reason (min. 5 chars) is required for cancelling.", // i18n-ignore (model-facing tool text)
      schema: z.object({ meetingId: z.string().min(1).max(100), status: z.enum(["PLANNED", "HELD", "APPROVED", "CANCELLED"]), reason: z.string().max(500).nullable() }),
      inputSchema: {
        type: "object",
        properties: { meetingId: { type: "string" }, status: { type: "string", enum: ["PLANNED", "HELD", "APPROVED", "CANCELLED"] }, reason: { type: ["string", "null"] } },
        required: ["meetingId", "status", "reason"],
        additionalProperties: false,
      },
      run: async ({ meetingId, status, reason }, { propose }) => {
        const meeting = await getMeeting(meetingId);
        if (!meeting) return { status: "not_found" };
        propose({ action: "changeStatus", title: `${meeting.meetingNumber} – ${meeting.title}`, details: [`→ ${status}`], payload: { meetingId: meeting.id, status, reason } });
        return PROPOSED;
      },
    }),
    aiTool({
      name: "propose_delete_meeting",
      operation: "delete",
      allowed: (user) => can(user.role, meetingsPermissions, "delete"),
      description: "PROPOSES deleting a meeting (id from list_meetings).", // i18n-ignore (model-facing tool text)
      schema: z.object({ meetingId: z.string().min(1).max(100) }),
      inputSchema: { type: "object", properties: { meetingId: { type: "string" } }, required: ["meetingId"], additionalProperties: false },
      run: async ({ meetingId }, { propose }) => {
        const meeting = await getMeeting(meetingId);
        if (!meeting) return { status: "not_found" };
        propose({ action: "delete", title: `${meeting.meetingNumber} – ${meeting.title}`, payload: { meetingId: meeting.id } });
        return PROPOSED;
      },
    }),
  ],
  actions: {
    create: aiAction({
      operation: "create",
      schema: createSchema,
      execute: (input) => createMeetingAction({ ...input, endTime: null, quorumRequired: null, copyFromMeetingId: null }),
    }),
    changeStatus: aiAction({
      operation: "update",
      schema: z.object({ meetingId: z.string().min(1).max(100), status: STATUS, reason: z.string().max(500).nullable() }),
      execute: (input) => changeMeetingStatusAction(input),
    }),
    delete: aiAction({ operation: "delete", schema: z.object({ meetingId: z.string().min(1).max(100) }), execute: ({ meetingId }) => deleteMeetingAction({ id: meetingId }) }),
  },
});
