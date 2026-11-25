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

/**
 * #584: Tüm gün kayıtları takvim arayüzünde Berlin gece yarısı (başlangıç) ve 23:59 (bitiş) olarak saklanır.
 * Tarih, sunucunun saat dilimi yerine Europe/Berlin takvimine göre yazılır; aksi halde UTC sunucuda bir gün
 * önceye kayar.
 */
const berlinDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Berlin",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const berlinTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const berlinYmd = (date: Date) => berlinDateFormatter.format(date); // YYYY-MM-DD
const addDaysYmd = (ymd: string, days: number) => {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const compactYmd = (ymd: string) => ymd.replace(/-/g, "");

/**
 * Tüm gün etkinliğin RFC 5545 tarihleri: DTEND dışlayıcıdır ve her zaman DTSTART'tan sonradır.
 * Bitiş Berlin gece yarısında ise (zaten dışlayıcı biçim) o gün; değilse bitiş gününün ertesi günü.
 */
export function allDayRange(start: Date, end: Date): { start: string; end: string } {
  const startYmd = berlinYmd(start);
  const endYmd = berlinYmd(end);
  const endIsMidnight = berlinTimeFormatter.format(end) === "00:00";
  let exclusiveEnd = endIsMidnight ? endYmd : addDaysYmd(endYmd, 1);
  if (exclusiveEnd <= startYmd) exclusiveEnd = addDaysYmd(startYmd, 1);
  return { start: compactYmd(startYmd), end: compactYmd(exclusiveEnd) };
}

/** RFC 5545 §3.3.11 metin kaçışı: ters eğik çizgi, noktalı virgül, virgül ve satır sonu. */
export function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
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
      const range = allDayRange(event.start, event.end);
      lines.push(`DTSTART;VALUE=DATE:${range.start}`, `DTEND;VALUE=DATE:${range.end}`);
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
