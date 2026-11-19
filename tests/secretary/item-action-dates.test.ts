import assert from "node:assert/strict";
import { test } from "node:test";

import { snoozeTarget } from "@/modules/secretary/components/item-action-dates";

test("item-actions: tomorrow picks the next Berlin date in winter", () => {
  assert.equal(snoozeTarget(new Date("2026-11-18T23:30:00Z"), 1), "2026-11-20T10:00:00.000Z");
});

test("item-actions: tomorrow and next week honor Berlin DST calendar days", () => {
  assert.equal(snoozeTarget(new Date("2026-03-29T00:30:00Z"), 1), "2026-03-30T10:00:00.000Z");
  assert.equal(snoozeTarget(new Date("2026-03-29T00:30:00Z"), 7), "2026-04-05T10:00:00.000Z");
  assert.equal(snoozeTarget(new Date("2026-10-25T00:30:00Z"), 1), "2026-10-26T10:00:00.000Z");
});
