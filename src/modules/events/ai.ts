import "server-only";

import { z } from "zod";

import { PROPOSED, aiAction, aiTool, defineModuleAi } from "@/shared/ai/define";
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

export const ai = defineModuleAi({
  module: "events",
  tools: [
    aiTool({
      name: "list_upcoming_events",
      operation: "read",
      allowed: (user) => can(user.role, eventsPermissions, "view"),
      description: "Upcoming events: title, type, status, dates, location, registered count and capacity. No attendee names.", // i18n-ignore (model-facing tool text)
      schema: z.object({ limit: z.number().int().min(1).max(25) }),
      inputSchema: {
        type: "object",
        properties: { limit: { type: "integer", description: "Maximum number of events (1-25)" } }, // i18n-ignore (model-facing tool text)
        required: ["limit"],
        additionalProperties: false,
      },
      run: async ({ limit }) => {
        const result = await listEvents({ timeFilter: "upcoming", sort: "startDate", dir: "asc", pageSize: limit });
        return result.items.map((event) => ({
          title: event.title,
          type: event.type,
          status: event.status,
          start: event.startDate.toISOString(),
          end: event.endDate?.toISOString() ?? null,
          location: event.isOnline ? "online" : event.location,
          registered: event.registeredCount,
          capacity: event.capacity,
        }));
      },
    }),
    aiTool({
      name: "propose_event",
      operation: "create",
      allowed: (user) => can(user.role, eventsPermissions, "create"),
      description: "PROPOSES a new event. Nothing is created until the user confirms the card. Dates as ISO 8601 local time (YYYY-MM-DDTHH:mm).", // i18n-ignore (model-facing tool text)
      schema: z.object({
        title: z.string().min(3).max(200),
        description: z.string().max(2000).nullable(),
        type: z.enum(["WORKSHOP", "SEMINAR", "SOCIAL", "CULTURAL", "SPORTS", "OTHER"]),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).nullable(),
        location: z.string().max(200).nullable(),
        isOnline: z.boolean(),
      }),
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: ["string", "null"] },
          type: { type: "string", enum: ["WORKSHOP", "SEMINAR", "SOCIAL", "CULTURAL", "SPORTS", "OTHER"] },
          startDate: { type: "string", description: "YYYY-MM-DDTHH:mm" }, // i18n-ignore (model-facing tool text)
          endDate: { type: ["string", "null"], description: "YYYY-MM-DDTHH:mm" }, // i18n-ignore (model-facing tool text)
          location: { type: ["string", "null"] },
          isOnline: { type: "boolean" },
        },
        required: ["title", "description", "type", "startDate", "endDate", "location", "isOnline"],
        additionalProperties: false,
      },
      run: async (input, { propose }) => {
        propose({ action: "create", title: input.title, details: [input.type, input.startDate.replace("T", " "), input.isOnline ? "online" : (input.location ?? "")].filter(Boolean), payload: input });
        return PROPOSED;
      },
    }),
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
