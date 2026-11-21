import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * SEC2 (#409): source-level ownership regression for Secretary follow-ups.
 * These checks prevent accidental removal of user scoping from the real
 * action/service boundary. They are not a database-backed IDOR integration test.
 */
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const actions = read("src/modules/secretary/actions/follow-ups.ts");
const service = read("src/modules/secretary/services/follow-ups.ts");

test("all follow-up server actions require authorization and use the authenticated user", () => {
  for (const name of ["createFollowUpAction", "listMyFollowUpsAction", "changeFollowUpAction"]) {
    const start = actions.indexOf(`export async function ${name}(`);
    assert.ok(start >= 0, `missing ${name}`);
    const end = actions.indexOf("\nexport async function ", start + 1);
    const body = actions.slice(start, end < 0 ? undefined : end);
    assert.match(body, /createAction\(\{/);
    assert.match(body, /permission: \{ definition: secretaryPermissions, action: "view" \}/);
    assert.match(body, /handler: async \(\{[^}]*user/);
  }
  assert.match(actions, /createFollowUp\(user\.id, input\)/);
  assert.match(actions, /listFollowUps\(user\.id, statuses\)/);
  assert.match(actions, /transitionFollowUp\(user, input\.id, input\.command/);
  assert.match(actions, /z\.object\(\{ id: z\.string\(\)\.min\(1\)\.max\(64\), command:/);
  assert.match(actions, /\.strict\(\)/);
});

test("read and create operations are scoped to the caller's user ID", () => {
  assert.match(service, /secretaryFollowUp\.count\(\{ where: \{ userId, status:/);
  assert.match(service, /secretaryFollowUp\.create\(\{\s*data: \{ userId,/);
  assert.match(service, /secretaryFollowUp\.findMany\(\{ where: \{ userId, status:/);
  assert.match(service, /export async function dueFollowUpsFor\(userId: string/);
  assert.match(service, /where: \{ userId, status: \{ in: \["ACTIVE", "EXHAUSTED"\] \}/);
});

test("follow-up mutation is atomic and cannot update or reveal another user's record", () => {
  const start = service.indexOf("export async function transitionFollowUp(");
  const end = service.indexOf("\nexport type ReminderRunDeps", start);
  assert.ok(start >= 0 && end > start);
  const body = service.slice(start, end);
  assert.match(body, /secretaryFollowUp\.updateMany\(\{\s*where: \{ id, userId: user\.id, status:/);
  assert.match(body, /if \(result\.count !== 1\)/);
  assert.match(body, /secretaryFollowUp\.findFirst\(\{ where: \{ id, userId: user\.id \}/);
  assert.match(body, /errors\.notFound/);
  assert.doesNotMatch(body, /secretaryFollowUp\.update\(/);
});
