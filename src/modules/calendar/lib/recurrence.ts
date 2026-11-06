export type Recurrence = "NONE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export type RecurringEntry = {
  startsAt: Date;
  endsAt: Date;
  recurrence: Recurrence;
  recurrenceInterval: number;
  recurrenceUntil: Date | null;
};

/** Safety cap: never expand more than this many occurrences per entry and range. */
export const MAX_OCCURRENCES = 500;

function addStep(date: Date, recurrence: Recurrence, interval: number, index: number): Date {
  const next = new Date(date);
  const step = interval * index;
  switch (recurrence) {
    case "DAILY": next.setDate(next.getDate() + step); break;
    case "WEEKLY": next.setDate(next.getDate() + step * 7); break;
    case "MONTHLY": {
      const day = next.getDate();
      next.setDate(1);
      next.setMonth(next.getMonth() + step);
      // Clamp 31st → last day of shorter months.
      const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
      next.setDate(Math.min(day, last));
      break;
    }
    case "YEARLY": next.setFullYear(next.getFullYear() + step); break;
    default: break;
  }
  return next;
}

/**
 * Occurrences of an entry that overlap [from, to). Non-recurring entries yield
 * at most one occurrence. Returned starts keep the original time of day.
 */
export function expandOccurrences(entry: RecurringEntry, from: Date, to: Date): { start: Date; end: Date }[] {
  const duration = entry.endsAt.getTime() - entry.startsAt.getTime();
  const overlaps = (start: Date) => start < to && start.getTime() + duration > from.getTime();
  if (entry.recurrence === "NONE") return overlaps(entry.startsAt) ? [{ start: entry.startsAt, end: entry.endsAt }] : [];

  const interval = Math.max(1, Math.floor(entry.recurrenceInterval || 1));
  const until = entry.recurrenceUntil;
  const out: { start: Date; end: Date }[] = [];
  // Jump close to the range start for daily/weekly series instead of iterating from the origin.
  let index = 0;
  if (entry.recurrence === "DAILY" || entry.recurrence === "WEEKLY") {
    const stepMs = (entry.recurrence === "DAILY" ? 1 : 7) * interval * 86_400_000;
    index = Math.max(0, Math.floor((from.getTime() - duration - entry.startsAt.getTime()) / stepMs));
  }
  for (let guard = 0; guard < MAX_OCCURRENCES * 4 && out.length < MAX_OCCURRENCES; guard += 1, index += 1) {
    const start = addStep(entry.startsAt, entry.recurrence, interval, index);
    if (until && start > until) break;
    if (start >= to) break;
    if (overlaps(start)) out.push({ start, end: new Date(start.getTime() + duration) });
  }
  return out;
}
