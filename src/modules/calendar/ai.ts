import "server-only";
import { aiToolV2, defineModuleAiV2 } from "@/shared/ai/v2";
import {aiProposalTools} from "./services/ai-proposal-tools";

import { z } from "zod";

import {DATE_RE, aiAction} from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { saveEntryAction } from "./actions/calendar-actions";
import {listAiSharedCalendars,listAiSharedCalendarEntries} from "./services/ai-lists";
import {aiListCursor} from "@/shared/ai/pagination";
import { calendarPermissions } from "./permissions";

/**
 * Takvim. Yapay zekâ YALNIZ ortak takvimleri görür; kişisel takvim kayıtları ve dış takvimden
 * (Google/Outlook/Apple) alınan kayıtlar hiçbir zaman okunmaz (veri politikası: CalendarEntry K3 kuralı,
 * CalendarSyncEvent K1). Açıklama, yer ve oluşturan adı dönmez. Yazma yalnız öneri + kullanıcı onayıyla.
 * Not: modülün K1 tablolarıyla aynı adlı alanlar (ad, başlık…) burada yalnız K2/K3 satırlardan ve
 * kullanıcının kendi öneri girdisinden gelir; bu yüzden nesne ayrıştırmayla okunur.
 */

const entrySchema = z.object({
  calendarId: z.string().min(1).max(64),
  title: z.string().min(1).max(200),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  allDay: z.boolean(),
  location: z.string().max(300).nullable(),
  description: z.string().max(2000).nullable(),
});

export const ai = defineModuleAiV2({
  module: "calendar",
  tools: [
    aiToolV2({
      name: "list_shared_calendars",
      operation: "read",
      allowed: (user) => can(user.role, calendarPermissions, "view"),
      description: "Lists the organisation's shared calendars (id, name). Personal calendars are private and never listed.", // i18n-ignore (model-facing tool text)
      input: z.object({cursor:aiListCursor}),
      run:async({cursor})=>listAiSharedCalendars(cursor),
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "calendar-list-shared-calendars", "serverReads": ["Calendar"], "modelFields": ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "items", "items.id", "items.name"], "processing": "approved_provider", "modelDataClass": "internal"},
    }),
    aiToolV2({
      name: "list_shared_calendar_entries",
      operation: "read",
      allowed: (user) => can(user.role, calendarPermissions, "view"),
      description: "Entries of shared calendars in a date range (YYYY-MM-DD, max 120 days; recurring entries expanded): calendar, title, start, end, allDay. Personal and externally synced entries are never included. Cursor pages are live, not a snapshot. A refine_range result requires a shorter date range. Events, meetings, tasks and course sessions have their own tools.", // i18n-ignore (model-facing tool text)
      input:z.object({from:z.string().regex(DATE_RE),to:z.string().regex(DATE_RE),cursor:aiListCursor}),
      run:args=>listAiSharedCalendarEntries(args),
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "calendar-list-shared-calendar-entries", "serverReads": ["Calendar", "CalendarEntry"], "modelFields": ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "status", "items", "items.calendar", "items.title", "items.start", "items.end", "items.allDay"], "processing": "approved_provider", "modelDataClass": "internal"},
    }),
    ...aiProposalTools,
  ],
  actions: {
    create: aiAction({
      operation: "create",
      schema: entrySchema,
      execute: (input) => saveEntryAction({ ...input, recurrence: "NONE", recurrenceInterval: 1 }),
    }),
  },
});
