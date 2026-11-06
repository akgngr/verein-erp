/** Minimal RFC 5545 writer for read-only subscriptions. */
export type IcsEvent = {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  description?: string | null;
  location?: string | null;
  url?: string | null;
  updatedAt?: Date;
  rrule?: string | null;
};

const pad = (value: number) => String(value).padStart(2, "0");
const utc = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
const day = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;

export function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char, "utf8") > (parts.length ? 74 : 75)) {
      parts.push(current);
      current = char;
    } else current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function rruleFor(recurrence: string, interval: number, until: Date | null): string | null {
  if (recurrence === "NONE") return null;
  return `FREQ=${recurrence};INTERVAL=${Math.max(1, interval)}${until ? `;UNTIL=${utc(until)}` : ""}`;
}

export function buildIcs(name: string, events: IcsEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//verein-erp//calendar//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(name)}`,
  ];
  for (const event of events) {
    lines.push("BEGIN:VEVENT", `UID:${event.uid}`, `DTSTAMP:${utc(event.updatedAt ?? now)}`);
    if (event.allDay) {
      const endDay = new Date(event.end.getTime() <= event.start.getTime() ? event.start.getTime() + 86_400_000 : event.end.getTime());
      lines.push(`DTSTART;VALUE=DATE:${day(event.start)}`, `DTEND;VALUE=DATE:${day(endDay)}`);
    } else {
      lines.push(`DTSTART:${utc(event.start)}`, `DTEND:${utc(event.end)}`);
    }
    lines.push(`SUMMARY:${escapeIcs(event.title)}`);
    if (event.description) lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
    if (event.location) lines.push(`LOCATION:${escapeIcs(event.location)}`);
    if (event.url) lines.push(`URL:${event.url}`);
    if (event.rrule) lines.push(`RRULE:${event.rrule}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
