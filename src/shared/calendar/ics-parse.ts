import type { RemoteEvent } from "./sync";

/** Unfold RFC 5545 content lines. */
function unfold(text: string): string[] {
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function unescape(value: string): string {
  return value.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

/**
 * Parse DTSTART/DTEND values. UTC ("Z") and floating/TZID times are read as
 * UTC resp. local wall time; with CalDAV <expand> servers return UTC.
 */
export function parseIcsDate(value: string, params: string): { date: Date; allDay: boolean } | null {
  if (/VALUE=DATE(?!-)/i.test(params) || /^\d{8}$/.test(value)) {
    const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
    return match ? { date: new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])), allDay: true } : null;
  }
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi, s, z] = match;
  const parts = [Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)] as const;
  return { date: z ? new Date(Date.UTC(...parts)) : new Date(...parts), allDay: false };
}

/** Extract VEVENTs (already expanded occurrences) from an iCalendar document. */
export function parseIcsEvents(text: string): RemoteEvent[] {
  const events: RemoteEvent[] = [];
  let current: Record<string, { value: string; params: string }> | null = null;
  for (const line of unfold(text)) {
    if (line === "BEGIN:VEVENT") { current = {}; continue; }
    if (line === "END:VEVENT") {
      if (current) {
        const start = current.DTSTART && parseIcsDate(current.DTSTART.value, current.DTSTART.params);
        const endRaw = current.DTEND && parseIcsDate(current.DTEND.value, current.DTEND.params);
        if (start && current.UID && current.STATUS?.value !== "CANCELLED") {
          const end = endRaw?.date ?? new Date(start.date.getTime() + (start.allDay ? 86_400_000 : 3_600_000));
          const recurrence = current["RECURRENCE-ID"]?.value ?? (start.date.getTime().toString());
          events.push({
            remoteId: `${current.UID.value}:${recurrence}`,
            title: unescape(current.SUMMARY?.value ?? ""),
            description: current.DESCRIPTION ? unescape(current.DESCRIPTION.value) : null,
            location: current.LOCATION ? unescape(current.LOCATION.value) : null,
            start: start.date,
            // iCalendar all-day DTEND is exclusive; the calendar stores inclusive ends.
            end: start.allDay ? new Date(end.getTime() - 60_000) : end,
            allDay: start.allDay,
          });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const [name, ...params] = line.slice(0, colon).split(";");
    current[name.toUpperCase()] = { value: line.slice(colon + 1), params: params.join(";") };
  }
  return events;
}
