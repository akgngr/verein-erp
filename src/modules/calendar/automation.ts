import "server-only";

import { z } from "zod";

import { defineEvent, defineTask } from "@/shared/automation/define";

/** Takvime randevu eklendi. Başlık ve yer yalnız gönderim anında okunur. */
export const calendarEntryCreatedEvent = defineEvent({
  key: "calendar.entry_created",
  description: "calendar.entry_created",
  payloadSchema: z.object({
    entryId: z.string().min(1).max(128),
    calendarKind: z.enum(["PERSONAL", "SHARED"]),
    allDay: z.boolean(),
  }).strict(),
  variables: {
    namespace: "entry",
    fields: ["title", "startsAt", "endsAt", "location"],
    load: async (payload): Promise<Record<string, string | number | null>> => {
      const { getDb } = await import("@/shared/db");
      const entry = await getDb().calendarEntry.findUnique({ where: { id: payload.entryId }, select: { title: true, startsAt: true, endsAt: true, location: true } });
      if (!entry) return {};
      const format = (date: Date) => date.toISOString().slice(0, 16).replace("T", " ");
      return { title: entry.title, startsAt: format(entry.startsAt), endsAt: format(entry.endsAt), location: entry.location ?? null };
    },
  },
});

/** Pulls connected external calendars (Google/Outlook/Apple plugins). Admin schedules it, e.g. every 30 minutes. */
export const calendarSyncTask = defineTask({
  key: "calendar.sync_external",
  version: 1,
  description: "calendar.sync_external",
  inputSchema: z.object({}).strict(),
  timeoutSeconds: 600,
  retry: { maxAttempts: 1, initialDelaySeconds: 0, maxDelaySeconds: 0, backoffMultiplier: 1 },
  workflow: { defaultInput: {} },
  schedule: { input: () => ({}), minIntervalMinutes: 15 },
  idempotencyKey: () => `calendar:sync:${Math.floor(Date.now() / 60_000)}`,
  handler: async () => {
    const { syncAllAccounts } = await import("./services/sync");
    return syncAllAccounts();
  },
});
