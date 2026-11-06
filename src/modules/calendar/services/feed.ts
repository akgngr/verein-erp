import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getUserById } from "@/modules/users/automation";
import { getDb } from "@/shared/db";

import { buildIcs, rruleFor, type IcsEvent } from "../lib/ics";
import { loadRange } from "./range";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Create or rotate the user's subscription token. The raw token is returned once. */
export async function rotateFeedToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await getDb().calendarFeedToken.upsert({
    where: { userId },
    create: { userId, tokenHash: hash(token) },
    update: { tokenHash: hash(token), createdAt: new Date(), lastUsedAt: null },
  });
  return token;
}

export async function revokeFeedToken(userId: string): Promise<void> {
  await getDb().calendarFeedToken.deleteMany({ where: { userId } });
}

export async function hasFeedToken(userId: string): Promise<boolean> {
  return (await getDb().calendarFeedToken.count({ where: { userId } })) > 0;
}

/**
 * ICS for a token: the owner's visible calendars and module items, with the
 * owner's CURRENT role and permissions (an inactive user gets nothing).
 */
export async function buildFeedForToken(token: string, calendarName: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const db = getDb();
  const record = await db.calendarFeedToken.findUnique({ where: { tokenHash: hash(token) } });
  if (!record) return null;
  const user = await getUserById(record.userId);
  if (!user?.isActive) return null;
  await db.calendarFeedToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });

  const now = new Date();
  const from = new Date(now.getTime() - 60 * 86_400_000);
  const to = new Date(now.getTime() + 365 * 86_400_000);
  const items = await loadRange({ id: user.id, role: user.role }, from, to);

  // Own recurring entries are exported once with an RRULE instead of expanded copies.
  const seenEntries = new Set<string>();
  const entryIds = [...new Set(items.filter((item) => item.entryId).map((item) => item.entryId!))];
  const entries = new Map((await db.calendarEntry.findMany({ where: { id: { in: entryIds } } })).map((entry) => [entry.id, entry]));
  const events: IcsEvent[] = [];
  for (const item of items) {
    if (item.entryId) {
      if (seenEntries.has(item.entryId)) continue;
      seenEntries.add(item.entryId);
      const entry = entries.get(item.entryId);
      if (!entry) continue;
      events.push({
        uid: `${entry.id}@verein-erp`,
        title: entry.title,
        start: entry.startsAt,
        end: entry.endsAt,
        allDay: entry.allDay,
        description: entry.description,
        location: entry.location,
        updatedAt: entry.updatedAt,
        rrule: rruleFor(entry.recurrence, entry.recurrenceInterval, entry.recurrenceUntil),
      });
    } else {
      events.push({ uid: `${item.id}@verein-erp`, title: item.title, start: new Date(item.start), end: new Date(item.end), allDay: item.allDay, location: item.location });
    }
  }
  return buildIcs(calendarName, events, now);
}
