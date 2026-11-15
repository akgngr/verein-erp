import "server-only";
import { aiToolV2, defineModuleAiV2 } from "@/shared/ai/v2";
import {aiProposalTools} from "./services/ai-proposal-tools";

import { z } from "zod";
import {aiListCursor,aiListPage,aiPageInfo} from "@/shared/ai/pagination";

import {aiAction} from "@/shared/ai/define";
import { can } from "@/shared/permissions/define";

import { eventsPermissions } from "./permissions";
import { createEventAction, listEvents } from "./server";

/** Etkinlikler: katılımcı adı dönmez; öneriler taslak etkinlik oluşturur. Sözleşme: src/shared/ai/define.ts. */
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).nullable(),
  type: z.enum(["WORKSHOP", "SEMINAR", "SOCIAL", "CULTURAL", "SPORTS", "OTHER"]),
  startDate: z.string().regex(DATETIME),
  endDate: z.string().regex(DATETIME).nullable(),
  location: z.string().max(200).nullable(),
  isOnline: z.boolean(),
});

export const ai = defineModuleAiV2({
  module: "events",
  tools: [
    aiToolV2({
      name: "list_upcoming_events",
      operation: "read",
      allowed: (user) => can(user.role, eventsPermissions, "view"),
      description: "Upcoming events: title, type, status, dates, location, registered count and capacity. No attendee names.", // i18n-ignore (model-facing tool text)
      input: z.object({ cursor:aiListCursor,limit: z.number().int().min(1).max(25) }),
      run: async ({ cursor,limit }) => {
        const result = await listEvents({ timeFilter: "upcoming", sort: "startDate", dir: "asc", page:aiListPage(cursor),pageSize: limit });
        return {...aiPageInfo(result.page,result.pageSize,result.total),items:result.items.map((event) => ({
          title: event.title,
          type: event.type,
          status: event.status,
          start: event.startDate.toISOString(),
          end: event.endDate?.toISOString() ?? null,
          location: event.isOnline ? "online" : event.location,
          registered: event.registeredCount,
          capacity: event.capacity,
        }))};
      },
      result: z.unknown(), modelOutput: z.unknown(), projectForModel: (result) => result,
      policy: {"purpose": "events-list-upcoming-events", "serverReads": ["Event"], "modelFields": ["page", "pageSize", "total", "hasMore", "nextCursor", "completeness", "items", "items.title", "items.type", "items.status", "items.start", "items.end", "items.location", "items.registered", "items.capacity"], "processing": "approved_provider", "modelDataClass": "internal"},
    }),
    ...aiProposalTools,
  ],
  actions: {
    create: aiAction({
      operation: "create",
      schema: createSchema,
      execute: async (input) => {
        // Etkinlik her zaman TASLAK olarak oluşturulur.
        const created = await createEventAction({ ...input, status: "DRAFT" });
        return { ok: created.success, error: created.error ?? undefined };
      },
    }),
  },
});
