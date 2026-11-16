import "server-only";
import {z} from "zod";
import {aiToolV2} from "@/shared/ai/v2";
import {proposalAcknowledgementSchema} from "@/shared/ai/dataset";
import {DATE_RE,PROPOSED} from "@/shared/ai/define";
import {can} from "@/shared/permissions/define";
import {calendarPermissions} from "../permissions";
const TIME_RE = /^\d{2}:\d{2}$/;
function toInstant(date: string, time: string | null, end = false): Date {
  const [y, m, d] = date.split("-").map(Number);
  if (!time) return end ? new Date(y, m - 1, d, 23, 59) : new Date(y, m - 1, d);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}
import {getDb} from "@/shared/db";

/** Server-only proposal definitions; domain actions are invoked only by explicit confirmation. */
export const aiProposalTools=[
aiToolV2({
      name: "propose_calendar_entry",
      operation: "create",
      allowed: (user) => can(user.role, calendarPermissions, "view"),
      description: "PROPOSES adding an appointment. calendarId from list_shared_calendars, or null for the user's own personal calendar. Date YYYY-MM-DD, times HH:mm (null = all day). Nothing is created until the user confirms.", // i18n-ignore (model-facing tool text)
      input:(z.object({
        calendarId: z.string().min(1).max(64).nullable(),
        title: z.string().min(1).max(200),
        date: z.string().regex(DATE_RE),
        startTime: z.string().regex(TIME_RE).nullable(),
        endTime: z.string().regex(TIME_RE).nullable(),
        location: z.string().max(300).nullable(),
        description: z.string().max(2000).nullable(),
      })).strict(),
      result:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["calendar_not_found","open_calendar_once_first","end_before_start"])}).strict()]),modelOutput:z.union([proposalAcknowledgementSchema,z.object({status:z.enum(["calendar_not_found","open_calendar_once_first","end_before_start"])}).strict()]),
      policy:{"purpose":"calendar-proposal","serverReads":["Calendar"],"modelFields":["status","note"],"processing":"approved_provider","modelDataClass":"internal"},projectForModel:result=>result,
      run: async ({ location, description, title, ...input }, { user, propose }) => {
        const db = getDb();
        const calendar = input.calendarId
          ? await db.calendar.findFirst({ where: { id: input.calendarId, kind: "SHARED", isActive: true }, select: { id: true } })
          : await db.calendar.findFirst({ where: { kind: "PERSONAL", ownerId: user.id }, select: { id: true } });
        if (!calendar) return { status: input.calendarId ? "calendar_not_found" : "open_calendar_once_first" } as const;
        const allDay = !input.startTime;
        const startsAt = toInstant(input.date, input.startTime);
        const endsAt = allDay ? toInstant(input.date, null, true) : input.endTime ? toInstant(input.date, input.endTime) : new Date(startsAt.getTime() + 3_600_000);
        if (endsAt < startsAt) return { status: "end_before_start" } as const;
        propose({
          action: "create",
          title,
          details: [[input.date, input.startTime && `${input.startTime}${input.endTime ? `–${input.endTime}` : ""}`].filter(Boolean).join(" "), location ?? ""].filter(Boolean),
          payload: { calendarId: calendar.id, title, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), allDay, location, description },
        });
        return PROPOSED;
      },
    })
];
