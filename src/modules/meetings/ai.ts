import "server-only";
import {aiProposalTools} from "./services/ai-proposal-tools";

import { z } from "zod";
import {aiListCursor,aiListPage,aiPageInfo} from "@/shared/ai/pagination";

import {DATE_RE, aiAction, aiTool, defineModuleAi, isoDay} from "@/shared/ai/define";
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
      schema: z.object({ cursor:aiListCursor, from: z.string().regex(DATE_RE).nullable(), to: z.string().regex(DATE_RE).nullable() }),
      inputSchema: { type: "object", properties: { cursor:{type:"string",pattern:"^[1-9]\\d{0,3}$"}, from: { type: ["string", "null"] }, to: { type: ["string", "null"] } }, required: ["from", "to"], additionalProperties: false },
      run: async ({ cursor,from, to }) => {
        const params = parseListParams(
          { page:String(aiListPage(cursor)),pageSize: "50", ...(from ? { "filter.from":from } : {}), ...(to ? { "filter.to":to } : {}) },
          { sortableFields: MEETING_SORTABLE_FIELDS, defaultSort: MEETING_DEFAULT_SORT, defaultDir: "desc", filterKeys: ["type", "status", "from", "to"] },
        );
        const result = await listMeetings(params);
        return {...aiPageInfo(result.page,result.pageSize,result.total),items:result.rows.map((row) => ({ id: row.id, number: row.meetingNumber, type: row.type, title: row.title, date: isoDay(row.meetingDate), startTime: row.startTime, location: row.location, status: row.status, decisions: row.decisionCount, openActionItems: row.openActionItemCount }))};
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
        if (!meeting) return { status: "not_found" } as const;
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
    ...aiProposalTools,

  ],
  actions: {
    create: aiAction({
      operation: "create",
      schema: createSchema,
      execute: (input) => createMeetingAction({ ...input, endTime: null, quorumRequired: null, copyFromMeetingId: null }),
    }),
    changeStatus: aiAction({
      operation: "update",
      snapshot: (input)=>getMeeting(input.meetingId),
      schema: z.object({ meetingId: z.string().min(1).max(100), status: STATUS, reason: z.string().max(500).nullable() }),
      execute: (input) => changeMeetingStatusAction(input),
    }),
    delete: aiAction({ operation: "delete", snapshot: (input)=>getMeeting(input.meetingId), schema: z.object({ meetingId: z.string().min(1).max(100) }), execute: ({ meetingId }) => deleteMeetingAction({ id: meetingId }) }),
  },
});
