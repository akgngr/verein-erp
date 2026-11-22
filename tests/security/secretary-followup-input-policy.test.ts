import assert from "node:assert/strict";
import test from "node:test";

import {
  FOLLOW_UP_STATUSES,
  TRANSITIONS,
  followUpInputSchema,
  isSafeSourceHref,
} from "../../src/modules/secretary/services/follow-up-policy";

/**
 * SEC2 (#409): executable input and state-machine boundary checks.
 * These do not replace database-backed ownership/IDOR integration tests.
 */
test("follow-up source URLs reject external navigation and traversal", () => {
  for (const href of [
    "https://example.org", "//example.org/path", "/a/../b", "/a/./b",
    "/a?token=secret", "/a#fragment", "/a%2fb", "/a\\b",
    "/a\nheader", "/a b", "",
  ]) {
    assert.equal(isSafeSourceHref(href), false, `unsafe source: ${JSON.stringify(href)}`);
  }
  assert.equal(isSafeSourceHref("/sekreter/aufgaben"), true);
});

test("follow-up creation rejects unknown fields, invalid dates and unsafe sources", () => {
  const valid = {
    sourceModule: "secretary",
    sourceHref: "/sekreter/aufgaben",
    title: "Synthetic follow-up",
    dueOn: "2026-12-01",
  };
  assert.equal(followUpInputSchema.safeParse(valid).success, true);
  for (const patch of [
    { userId: "another-user" },
    { tenantId: "another-tenant" },
    { sourceHref: "//attacker.example" },
    { dueOn: "2026-02-30" },
    { maxReminders: 0 },
    { maxReminders: 11 },
  ]) {
    assert.equal(followUpInputSchema.safeParse({ ...valid, ...patch }).success, false, JSON.stringify(patch));
  }
});

test("terminal follow-up statuses cannot be reopened by any command", () => {
  const statuses = new Set<string>(FOLLOW_UP_STATUSES);
  for (const [command, transition] of Object.entries(TRANSITIONS)) {
    assert.ok(statuses.has(transition.to), `${command} targets an unknown status`);
    assert.equal(new Set(transition.from).size, transition.from.length, `${command} duplicates source status`);
    assert.equal(transition.from.includes("DONE"), false, `${command} reopens DONE`);
    assert.equal(transition.from.includes("CANCELLED"), false, `${command} reopens CANCELLED`);
  }
});
