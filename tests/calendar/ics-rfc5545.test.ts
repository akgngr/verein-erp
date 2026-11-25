import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { allDayRange, buildIcs, escapeIcs } from "@/modules/calendar/lib/ics";
import { parseCalendarList } from "@/modules/calendar-apple/calendar-sync";
import { berlinMidnight } from "@/shared/calendar/berlin-date";
import { isAllowedSyncUrl } from "@/shared/calendar/sync";

// #584: RFC 5545 çıktısı, CalDAV ayrıştırma ve senkron adres izin listesi.
describe("calendar ICS (RFC 5545)", () => {
  test("text escaping: backslash, semicolon, comma, newline", () => {
    assert.equal(escapeIcs("a;b,c\\d\ne"), "a\\;b\\,c\\\\d\\ne");
  });

  test("single-day all-day entry stored as Berlin midnight → 23:59 gets an exclusive next-day DTEND", () => {
    const start = berlinMidnight(2026, 12, 5); // 2026-12-04T23:00Z
    const end = new Date(berlinMidnight(2026, 12, 6).getTime() - 60_000); // 23:59 Berlin
    assert.deepEqual(allDayRange(start, end), { start: "20261205", end: "20261206" });
  });

  test("all-day range is never empty and handles multi-day and summer time", () => {
    const start = berlinMidnight(2026, 7, 1);
    assert.deepEqual(allDayRange(start, start), { start: "20260701", end: "20260702" });
    const end = new Date(berlinMidnight(2026, 7, 4).getTime() - 60_000);
    assert.deepEqual(allDayRange(start, end), { start: "20260701", end: "20260704" });
  });

  test("buildIcs writes VALUE=DATE for all-day and UTC for timed events", () => {
    const ics = buildIcs("Kalender", [
      { uid: "a@x", title: "Fest; Grill, Musik", start: berlinMidnight(2026, 12, 5), end: new Date(berlinMidnight(2026, 12, 6).getTime() - 60_000), allDay: true },
      { uid: "b@x", title: "Sitzung", start: new Date("2026-12-05T13:00:00Z"), end: new Date("2026-12-05T15:00:00Z"), allDay: false },
    ], new Date("2026-11-25T08:00:00Z"));
    assert.match(ics, /DTSTART;VALUE=DATE:20261205\r\nDTEND;VALUE=DATE:20261206/);
    assert.match(ics, /DTSTART:20261205T130000Z\r\nDTEND:20261205T150000Z/);
    assert.ok(ics.includes(String.raw`SUMMARY:Fest\; Grill\, Musik`));
    assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  });

  test("berlinMidnight is independent of the server time zone", () => {
    assert.equal(berlinMidnight(2026, 12, 5).toISOString(), "2026-12-04T23:00:00.000Z");
    assert.equal(berlinMidnight(2026, 7, 5).toISOString(), "2026-07-04T22:00:00.000Z");
  });
});

describe("CalDAV and sync fetch", () => {
  const response = (resourceType: string) =>
    `<d:multistatus xmlns:d="DAV:"><d:response><d:href>/123/calendars/home/</d:href><d:propstat><d:prop><d:resourcetype>${resourceType}</d:resourcetype><d:displayname>Verein</d:displayname></d:prop></d:propstat></d:response></d:multistatus>`;

  test("calendar resource type is recognized self-closing and with an explicit end tag", () => {
    const home = "https://p12-caldav.icloud.com/123/calendars/";
    assert.equal(parseCalendarList(response("<d:collection/><cal:calendar/>"), home).length, 1);
    assert.equal(parseCalendarList(response("<d:collection/><cal:calendar></cal:calendar>"), home).length, 1);
    assert.equal(parseCalendarList(response("<d:collection/>"), home).length, 0);
  });

  test("redirect targets are checked against the provider allowlist", () => {
    const hosts = ["icloud.com"];
    assert.equal(isAllowedSyncUrl(hosts, new URL("https://p12-caldav.icloud.com/123/")), true);
    assert.equal(isAllowedSyncUrl(hosts, new URL("https://caldav.icloud.com/")), true);
    assert.equal(isAllowedSyncUrl(hosts, new URL("http://caldav.icloud.com/")), false);
    assert.equal(isAllowedSyncUrl(hosts, new URL("https://evil-icloud.com/")), false);
    assert.equal(isAllowedSyncUrl(hosts, new URL("https://169.254.169.254/")), false);
  });
});

test("berlinLocalDateTime formats the Berlin wall time expected by the event form", async () => {
  const { berlinLocalDateTime } = await import("@/shared/calendar/berlin-date");
  assert.equal(berlinLocalDateTime(new Date("2026-12-05T13:00:00Z")), "2026-12-05T14:00");
  assert.equal(berlinLocalDateTime(new Date("2026-07-05T12:00:00Z")), "2026-07-05T14:00");
});
