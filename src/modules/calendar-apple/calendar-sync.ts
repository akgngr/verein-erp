import "server-only";

import { parseIcsEvents } from "@/shared/calendar/ics-parse";
import { defineCalendarSync, syncFetch, type CalendarSyncProvider, type RemoteCalendar, type SyncCredentials } from "@/shared/calendar/sync";

const DEFAULT_SERVER = "https://caldav.icloud.com";

const decode = (text: string) => text.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&apos;/g, "'").replace(/&#13;/g, "\r").replace(/&amp;/g, "&");

/** Contents of all <prefix:tag> elements (namespace prefix agnostic). */
export function xmlBlocks(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<(?:[\\w-]+:)?${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, "gi");
  return [...xml.matchAll(pattern)].map((match) => match[1]);
}

const firstHref = (xml: string) => decode(xmlBlocks(xml, "href")[0]?.trim() ?? "");

function authHeaders(credentials: SyncCredentials, depth: "0" | "1") {
  const basic = Buffer.from(`${credentials.username ?? ""}:${credentials.password ?? ""}`).toString("base64");
  return { Authorization: `Basic ${basic}`, Depth: depth, "Content-Type": "application/xml; charset=utf-8" };
}

async function dav(credentials: SyncCredentials, method: "PROPFIND" | "REPORT", url: string, depth: "0" | "1", body: string): Promise<string> {
  const response = await syncFetch(provider, url, { method, headers: authHeaders(credentials, depth), body });
  if (response.status !== 207 && !response.ok) throw new Error(`SYNC_HTTP_${response.status}`);
  return response.text();
}

async function calendarHome(credentials: SyncCredentials): Promise<string> {
  const base = credentials.serverUrl || DEFAULT_SERVER;
  const principalXml = await dav(credentials, "PROPFIND", `${base}/`, "0",
    `<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:current-user-principal/></d:prop></d:propfind>`);
  const principal = firstHref(xmlBlocks(principalXml, "current-user-principal")[0] ?? "");
  if (!principal) throw new Error("SYNC_DISCOVERY");
  const principalUrl = new URL(principal, base).toString();
  const homeXml = await dav(credentials, "PROPFIND", principalUrl, "0",
    `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-home-set/></d:prop></d:propfind>`); // i18n-ignore (CalDAV XML protokol gövdesi)
  const home = firstHref(xmlBlocks(homeXml, "calendar-home-set")[0] ?? "");
  if (!home) throw new Error("SYNC_DISCOVERY");
  return new URL(home, principalUrl).toString();
}

/** Parse a Depth:1 PROPFIND on the calendar home into event calendars. */
export function parseCalendarList(xml: string, homeUrl: string): RemoteCalendar[] {
  return xmlBlocks(xml, "response").flatMap((response) => {
    const resourceType = xmlBlocks(response, "resourcetype")[0] ?? "";
    if (!/<(?:[\w-]+:)?calendar\s*\/>/i.test(resourceType)) return [];
    const components = xmlBlocks(response, "supported-calendar-component-set")[0];
    if (components && !/name="VEVENT"/i.test(components)) return [];
    const href = new URL(firstHref(response), homeUrl).toString();
    const name = decode(xmlBlocks(response, "displayname")[0]?.trim() ?? "") || href;
    const color = (xmlBlocks(response, "calendar-color")[0]?.trim() ?? "").slice(0, 7);
    return [{ remoteId: href, name, color: /^#[0-9a-f]{6}$/i.test(color) ? color : null }];
  });
}

const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

const provider: CalendarSyncProvider = {
  key: "apple",
  color: "#a3a3a3",
  auth: "password",
  defaultServerUrl: DEFAULT_SERVER,
  allowedHosts: ["icloud.com"],
  async accountLabel(credentials) {
    return credentials.username ?? "iCloud";
  },
  async listCalendars(credentials) {
    const home = await calendarHome(credentials);
    const xml = await dav(credentials, "PROPFIND", home, "1",
      `<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:a="http://apple.com/ns/ical/"><d:prop><d:resourcetype/><d:displayname/><a:calendar-color/><c:supported-calendar-component-set/></d:prop></d:propfind>`); // i18n-ignore (CalDAV XML protokol gövdesi)
    return parseCalendarList(xml, home);
  },
  async listEvents(credentials, calendar, range) {
    // Server-side expansion returns concrete occurrences in UTC.
    const xml = await dav(credentials, "REPORT", calendar.remoteId, "1",
      `<?xml version="1.0"?><c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"><d:prop><c:calendar-data><c:expand start="${stamp(range.from)}" end="${stamp(range.to)}"/></c:calendar-data></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range start="${stamp(range.from)}" end="${stamp(range.to)}"/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`); // i18n-ignore (CalDAV XML protokol gövdesi)
    return xmlBlocks(xml, "calendar-data").flatMap((data) => parseIcsEvents(decode(data)));
  },
};

export const calendarSync = defineCalendarSync({ module: "calendar-apple", providers: [provider] });
