/** Calendar math in local time; weeks start on Monday (DE/TR). */

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const offset = (day.getDay() + 6) % 7; // Monday = 0
  return addDays(day, -offset);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** ISO 8601 week number. */
export function isoWeek(date: Date): number {
  const target = startOfDay(date);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
}

/** 6×7 month grid starting on the Monday on/before the 1st. */
export function monthGrid(date: Date): Date[] {
  const first = startOfWeek(startOfMonth(date));
  return Array.from({ length: 42 }, (_, index) => addDays(first, index));
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export type CalendarView = "month" | "week" | "day" | "agenda";

/** Visible range [from, to) for a view anchored at `date`. */
export function viewRange(view: CalendarView, date: Date): { from: Date; to: Date } {
  switch (view) {
    case "day": return { from: startOfDay(date), to: addDays(startOfDay(date), 1) };
    case "week": return { from: startOfWeek(date), to: addDays(startOfWeek(date), 7) };
    case "agenda": return { from: startOfDay(date), to: addDays(startOfDay(date), 30) };
    default: {
      const grid = monthGrid(date);
      return { from: grid[0], to: addDays(grid[41], 1) };
    }
  }
}

export function shiftAnchor(view: CalendarView, date: Date, direction: -1 | 1): Date {
  if (view === "day") return addDays(date, direction);
  if (view === "week") return addDays(date, 7 * direction);
  if (view === "agenda") return addDays(date, 30 * direction);
  return new Date(date.getFullYear(), date.getMonth() + direction, 1);
}
