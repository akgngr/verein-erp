import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { TRANSITIONS } from "@/modules/secretary/services/follow-up-policy";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("follow-up lifecycle UI exposes only permitted transitions", () => {
  assert.deepEqual(TRANSITIONS.pause, { from: ["ACTIVE"], to: "PAUSED" });
  assert.deepEqual(TRANSITIONS.resume, { from: ["PAUSED"], to: "ACTIVE" });
  assert.deepEqual(TRANSITIONS.cancel.from, ["ACTIVE", "PAUSED", "EXHAUSTED"]);
  assert.deepEqual(TRANSITIONS.complete.from, ["ACTIVE", "PAUSED", "EXHAUSTED"]);
  const ui = read("src/modules/secretary/components/follow-ups.tsx");
  assert.match(ui, /ACTIVE: \["pause", "complete", "cancel"\]/);
  assert.match(ui, /PAUSED: \["resume", "complete", "cancel"\]/);
  assert.match(ui, /DONE: \[\]/);
  assert.match(ui, /CANCELLED: \[\]/);
});

test("follow-up UI uses real user-scoped actions, no fake success, and shared UI kit", () => {
  const ui = read("src/modules/secretary/components/follow-ups.tsx");
  assert.match(ui, /listMyFollowUpsAction\(\{ includeClosed: false \}\)/);
  assert.match(ui, /createFollowUpAction\(/);
  assert.match(ui, /changeFollowUpAction\(/);
  assert.match(ui, /if \(!result\.ok\)/);
  assert.match(ui, /isSafeSourceHref\(item\.sourceHref\)/);
  assert.match(ui, /role="alert"/);
  assert.match(ui, /setRefreshKey\(\(value\) => value \+ 1\)/);
  assert.match(ui, /setLoading\(true\)/);
  assert.match(ui, /labels\.retry/);
  assert.match(ui, /aria-busy=/);
  assert.match(ui, /@\/shared\/components\/kit/);
  assert.doesNotMatch(ui, /@heroui\/react|dangerouslySetInnerHTML|window\.location/);
});

test("follow-up UI translation keys agree between Turkish and German", () => {
  const tr = JSON.parse(read("src/modules/secretary/messages/tr.json")).ui;
  const de = JSON.parse(read("src/modules/secretary/messages/de.json")).ui;
  const source = read("src/modules/secretary/views/home-view.tsx");
  const keys = [...source.matchAll(/t\("ui\.(followUps\w+)"\)/g)].map((m) => m[1]);
  assert.ok(keys.length >= 15);
  for (const key of keys) {
    assert.equal(typeof tr[key], "string", `TR missing ${key}`);
    assert.equal(typeof de[key], "string", `DE missing ${key}`);
  }
});


test("follow-up cancellation requires explicit confirmation and supports dismissal", () => {
  const ui = read("src/modules/secretary/components/follow-ups.tsx");
  assert.match(ui, /command === "cancel" && confirmCancel !== item\.id/);
  assert.match(ui, /setConfirmCancel\(item\.id\); return;/);
  assert.match(ui, /role="group" aria-label=\{labels\.cancelPrompt\}/);
  assert.match(ui, /onPress=\{\(\) => setConfirmCancel\(null\)\}/);
});

test("follow-up list failures announce an accessible retry state", () => {
  const ui = read("src/modules/secretary/components/follow-ups.tsx");
  assert.match(ui, /loadFailed \? <div role="alert"/);
  assert.match(ui, /setLoading\(true\); setRefreshKey\(\(value\) => value \+ 1\)/);
  assert.match(ui, /role="status"/);
  assert.match(ui, /if \(!result\.ok\) \{ notify\.error\(labels\.error\); return; \}/);
});


test("follow-up write failures never display success or mutate the local list", () => {
  const ui = read("src/modules/secretary/components/follow-ups.tsx");
  assert.match(ui, /if \(!result\.ok\) \{ notify\.error\(labels\.error\); return; \}/);
  assert.match(ui, /catch \{\s*notify\.error\(labels\.error\);/);
  assert.match(ui, /if \(pending \|\| !AVAILABLE\[item\.status\]\.includes\(command\)\) return;/);
  assert.doesNotMatch(ui, /sendEmail|sendSms|sendTelegram|window\.open|localStorage/);
});
