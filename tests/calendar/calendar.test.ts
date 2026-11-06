import test, { describe } from "node:test";
import assert from "node:assert/strict";

import { addDays, isoWeek, monthGrid, startOfWeek, viewRange } from "@/modules/calendar/lib/dates";
import { buildIcs, escapeIcs, rruleFor } from "@/modules/calendar/lib/ics";
import { layoutDay } from "@/modules/calendar/lib/layout";
import { expandOccurrences, MAX_OCCURRENCES } from "@/modules/calendar/lib/recurrence";
import { moduleCalendarRegistry } from "@/calendar-registry";

const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

describe("calendar recurrence", () => {
  test("non-recurring entry overlapping the range is returned once", () => {
    const result = expandOccurrences({ startsAt: at(2026, 5, 1, 10), endsAt: at(2026, 5, 1, 11), recurrence: "NONE", recurrenceInterval: 1, recurrenceUntil: null }, at(2026, 5, 1), at(2026, 5, 2));
    assert.equal(result.length, 1);
  });

  test("weekly every two weeks respects interval and until", () => {
    const result = expandOccurrences({ startsAt: at(2026, 1, 5, 18), endsAt: at(2026, 1, 5, 19), recurrence: "WEEKLY", recurrenceInterval: 2, recurrenceUntil: at(2026, 3, 1) }, at(2026, 1, 1), at(2026, 12, 31));
    assert.deepEqual(result.map((item) => item.start.getDate()), [5, 19, 2, 16]);
  });

  test("monthly on the 31st clamps to the last day of shorter months", () => {
    const result = expandOccurrences({ startsAt: at(2026, 1, 31, 9), endsAt: at(2026, 1, 31, 10), recurrence: "MONTHLY", recurrenceInterval: 1, recurrenceUntil: null }, at(2026, 2, 1), at(2026, 5, 1));
    assert.deepEqual(result.map((item) => [item.start.getMonth() + 1, item.start.getDate()]), [[2, 28], [3, 31], [4, 30]]);
  });

  test("expansion is capped", () => {
    const result = expandOccurrences({ startsAt: at(2020, 1, 1, 9), endsAt: at(2020, 1, 1, 10), recurrence: "DAILY", recurrenceInterval: 1, recurrenceUntil: null }, at(2020, 1, 1), at(2026, 1, 1));
    assert.ok(result.length <= MAX_OCCURRENCES);
  });
});

describe("calendar dates", () => {
  test("weeks start on Monday and ISO week numbers match", () => {
    assert.equal(startOfWeek(at(2026, 11, 8)).getDay(), 1);
    assert.equal(isoWeek(at(2026, 1, 1)), 1);
    assert.equal(isoWeek(at(2020, 12, 31)), 53);
  });

  test("month grid has 42 days starting on Monday", () => {
    const grid = monthGrid(at(2026, 11, 15));
    assert.equal(grid.length, 42);
    assert.equal(grid[0].getDay(), 1);
  });

  test("week range spans seven days", () => {
    const { from, to } = viewRange("week", at(2026, 11, 6));
    assert.equal(to.getTime(), addDays(from, 7).getTime());
  });
});

describe("calendar layout", () => {
  test("overlapping items get separate columns", () => {
    const placed = layoutDay([
      { id: "a", start: at(2026, 1, 1, 9), end: at(2026, 1, 1, 11) },
      { id: "b", start: at(2026, 1, 1, 10), end: at(2026, 1, 1, 12) },
      { id: "c", start: at(2026, 1, 1, 13), end: at(2026, 1, 1, 14) },
    ]);
    assert.notEqual(placed.get("a")!.column, placed.get("b")!.column);
    assert.equal(placed.get("a")!.columns, 2);
    assert.equal(placed.get("c")!.columns, 1);
  });
});

describe("calendar ICS", () => {
  test("escapes special characters and folds long lines", () => {
    assert.equal(escapeIcs("a,b;c\\d\ne"), "a\\,b\;c\\\\d\\ne");
    const ics = buildIcs("Test", [{ uid: "1", title: "x".repeat(200), start: at(2026, 1, 1, 9), end: at(2026, 1, 1, 10), allDay: false }]);
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
    assert.ok(ics.split("\r\n").every((line) => Buffer.byteLength(line) <= 75));
  });

  test("rrule includes interval and until", () => {
    assert.equal(rruleFor("NONE", 1, null), null);
    assert.match(rruleFor("WEEKLY", 2, new Date(Date.UTC(2026, 2, 1)))!, /^FREQ=WEEKLY;INTERVAL=2;UNTIL=20260301T000000Z$/);
  });
});

describe("module calendar sources", () => {
  test("each source module is registered with unique keys", () => {
    const modules = moduleCalendarRegistry.map((item) => item.module).sort();
    assert.deepEqual(modules, ["courses", "documents", "events", "meetings", "tasks"]);
    for (const item of moduleCalendarRegistry) {
      const keys = item.sources.map((source) => source.key);
      assert.equal(new Set(keys).size, keys.length);
    }
  });
});
