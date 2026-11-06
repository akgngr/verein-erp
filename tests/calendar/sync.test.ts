import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { moduleCalendarSyncRegistry } from "@/calendar-sync-registry";
import { parseCalendarList, xmlBlocks } from "@/modules/calendar-apple/calendar-sync";
import { mapGoogleEvent } from "@/modules/calendar-google/calendar-sync";
import { mapGraphEvent } from "@/modules/calendar-outlook/calendar-sync";
import { parseIcsEvents } from "@/shared/calendar/ics-parse";
import { syncFetch, SyncAuthError } from "@/shared/calendar/sync";

describe("calendar sync plugins", () => {
  test("registry contains google, outlook and apple with unique keys and https-only hosts", () => {
    const providers = moduleCalendarSyncRegistry.flatMap((entry) => entry.providers);
    assert.deepEqual(providers.map((provider) => provider.key).sort(), ["apple", "google", "outlook"]);
    for (const provider of providers) {
      assert.ok(provider.allowedHosts.length > 0);
      if (provider.auth === "oauth") assert.ok(provider.oauth);
    }
  });

  test("google: all-day end is made inclusive, cancelled events are dropped", () => {
    const allDay = mapGoogleEvent({ id: "a", summary: "Urlaub", start: { date: "2026-11-10" }, end: { date: "2026-11-11" } })!;
    assert.equal(allDay.allDay, true);
    assert.equal(allDay.start.getDate(), 10);
    assert.equal(allDay.end.getDate(), 10);
    assert.equal(mapGoogleEvent({ id: "b", status: "cancelled", start: { dateTime: "2026-11-10T10:00:00Z" } }), null);
    const timed = mapGoogleEvent({ id: "c", start: { dateTime: "2026-11-10T10:00:00+01:00" }, end: { dateTime: "2026-11-10T11:00:00+01:00" } })!;
    assert.equal(timed.start.toISOString(), "2026-11-10T09:00:00.000Z");
  });

  test("outlook: UTC date-times from Graph are parsed as UTC", () => {
    const event = mapGraphEvent({ id: "x", subject: "Sitzung", start: { dateTime: "2026-11-10T09:00:00.0000000" }, end: { dateTime: "2026-11-10T10:30:00.0000000" } })!;
    assert.equal(event.start.toISOString(), "2026-11-10T09:00:00.000Z");
    assert.equal(event.end.toISOString(), "2026-11-10T10:30:00.000Z");
    assert.equal(mapGraphEvent({ id: "y", isCancelled: true, start: { dateTime: "2026-11-10T09:00:00" } }), null);
  });

  test("apple: CalDAV calendar list keeps only event calendars", () => {
    const xml = `<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
      <d:response><d:href>/123/calendars/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>
      <d:response><d:href>/123/calendars/work/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/><c:calendar/></d:resourcetype><d:displayname>Arbeit &amp; Verein</d:displayname><x:calendar-color xmlns:x="http://apple.com/ns/ical/">#FF2968FF</x:calendar-color><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set></d:prop></d:propstat></d:response>
      <d:response><d:href>/123/calendars/todo/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/><c:calendar/></d:resourcetype><d:displayname>Erinnerungen</d:displayname><c:supported-calendar-component-set><c:comp name="VTODO"/></c:supported-calendar-component-set></d:prop></d:propstat></d:response>
    </d:multistatus>`;
    const calendars = parseCalendarList(xml, "https://p01-caldav.icloud.com/123/calendars/");
    assert.deepEqual(calendars, [{ remoteId: "https://p01-caldav.icloud.com/123/calendars/work/", name: "Arbeit & Verein", color: "#FF2968" }]);
    assert.equal(xmlBlocks("<a:x>1</a:x><x>2</x>", "x").length, 2);
  });

  test("ICS parser reads expanded occurrences, unfolds lines and skips cancelled ones", () => {
    const ics = [
      "BEGIN:VCALENDAR", "BEGIN:VEVENT", "UID:1", "RECURRENCE-ID:20261110T090000Z", "DTSTART:20261110T090000Z", "DTEND:20261110T100000Z",
      "SUMMARY:Vorstand\\, Sitzung", "LOCATION:Raum", " 2", "END:VEVENT",
      "BEGIN:VEVENT", "UID:2", "DTSTART;VALUE=DATE:20261111", "DTEND;VALUE=DATE:20261112", "SUMMARY:Feiertag", "END:VEVENT",
      "BEGIN:VEVENT", "UID:3", "STATUS:CANCELLED", "DTSTART:20261112T090000Z", "SUMMARY:Abgesagt", "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const events = parseIcsEvents(ics);
    assert.equal(events.length, 2);
    assert.equal(events[0].title, "Vorstand, Sitzung");
    assert.equal(events[0].location, "Raum2");
    assert.equal(events[0].start.toISOString(), "2026-11-10T09:00:00.000Z");
    assert.equal(events[1].allDay, true);
    assert.equal(events[1].end.getDate(), 11);
  });

  test("syncFetch refuses non-allowlisted hosts and plain http before any request", async () => {
    await assert.rejects(syncFetch({ allowedHosts: ["googleapis.com"] }, "https://evil.example.com/x"), /SYNC_HOST_NOT_ALLOWED/);
    await assert.rejects(syncFetch({ allowedHosts: ["googleapis.com"] }, "http://www.googleapis.com/x"), /SYNC_HOST_NOT_ALLOWED/);
    await assert.rejects(syncFetch({ allowedHosts: ["googleapis.com"] }, "https://googleapis.com.evil.io/x"), /SYNC_HOST_NOT_ALLOWED/);
    assert.ok(new SyncAuthError() instanceof Error);
  });
});
