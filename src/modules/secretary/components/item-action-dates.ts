/** Berlin calendar-relative snooze targets, independent of server runtime. */
export function snoozeTarget(now: Date, days: 1 | 7): string {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const target = new Date(`${day}T00:00:00.000Z`);
  target.setUTCDate(target.getUTCDate() + days);
  // 10:00Z is 11:00 (winter) / 12:00 (summer) in Berlin:
  // unambiguously the chosen future calendar date even across DST.
  return `${target.toISOString().slice(0, 10)}T10:00:00.000Z`;
}
