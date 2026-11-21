import assert from "node:assert/strict";
import test from "node:test";

import { safeNotificationHref } from "@/modules/notifications/ui";

/** N1b: reject external navigation and encoded route escapes before rendering links. */
test("notification drawer only accepts simple internal routes", () => {
  for (const href of ["/tasks/abc", "/notifications/inbox", "/a-b/c_123"]) {
    assert.equal(safeNotificationHref(href), true, href);
  }
  for (const href of [
    null, undefined, "", "/", "//evil.example", "https://evil.example",
    "javascript:alert(1)", "/a?redirect=//evil.example", "/a#fragment",
    "/a%2fb", "/a/../b", "/a/./b", "/a\\b", "/a b",
    "/a\nnext", "/" + "a".repeat(300),
  ]) {
    assert.equal(safeNotificationHref(href), false, String(href));
  }
});

/** Keep the disconnected UI safe until the authenticated inbox adapter is mounted. */
test("notification drawer keeps mutation and accessibility safeguards", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../../src/modules/notifications/components/notification-bell-drawer.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /from ["']@\/shared\/components\/kit["']/);
  assert.doesNotMatch(source, /from ["']@heroui\/react["']/);
  assert.match(source, /isDisabled=\{!onReadAll \|\| pending \|\| busy \|\| unavailable \|\| count === 0\}/);
  assert.match(source, /isDisabled=\{!onRead \|\| pending \|\| busy \|\| unavailable\}/);
  assert.match(source, /isDisabled=\{!onSnooze \|\| pending \|\| busy \|\| unavailable\}/);
  assert.match(source, /role="alert"/);
  assert.match(source, /const count = unavailable \? 0 :/);
  assert.match(source, /const filtered = \(unavailable \? \[\] : items\)\.filter/);
  assert.match(source, /const modules = \[\.\.\.new Set\(\(unavailable \? \[\] : items\)\.map/);
  assert.match(source, /if \(!operation \|\| busy \|\| pending \|\| unavailable\) return;/);
  assert.match(source, /aria-busy=\{pending \|\| busy\}/);
  assert.match(source, /safeNotificationHref\(item\.href\)/);
  assert.doesNotMatch(source, /demoNotifications|mockNotifications|localStorage/);
});

/** Failed authenticated refresh must never leave a stale unread badge visible. */
test("notification inbox clears stale data when refresh fails", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../../src/modules/notifications/views/inbox-widget.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /if \(!list\.ok \|\| !unread\.ok\) \{ setItems\(\[\]\); setCount\(0\); setUnavailable\(true\); return; \}/);
  assert.match(source, /catch \{\s*if \(currentRequest !== requestId\.current\) return;\s*setItems\(\[\]\);\s*setCount\(0\);\s*setUnavailable\(true\);/);
});

/** An older poll must not replace a newer response or write after unmount. */
test("notification inbox invalidates stale async poll responses", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../../src/modules/notifications/views/inbox-widget.tsx", import.meta.url), "utf8");
  assert.match(source, /const currentRequest = \+\+requestId\.current/);
  assert.match(source, /if \(currentRequest !== requestId\.current\) return;/);
  assert.match(source, /requestId\.current\+\+;/);
});

/** Failed mutations must reject so the drawer announces an accessible error, not silent success. */
test("notification action failures propagate and clear stale badge state", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../../src/modules/notifications/views/inbox-widget.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(!result\.ok\) \{ setItems\(\[\]\); setCount\(0\); setUnavailable\(true\); throw new Error\("NOTIFICATION_ACTION_FAILED"\); \}/);
  assert.match(source, /catch \{\s*setItems\(\[\]\);\s*setCount\(0\);\s*setUnavailable\(true\);\s*throw new Error\("NOTIFICATION_ACTION_FAILED"\);/);
  const drawer = await readFile(new URL("../../src/modules/notifications/components/notification-bell-drawer.tsx", import.meta.url), "utf8");
  assert.match(drawer, /catch \{ setActionFailed\(true\); \}/);
  assert.match(drawer, /role="alert"/);
});

/** An in-flight poll must not restore stale data after a user mutation begins. */
test("notification mutations invalidate in-flight polls before invoking the server", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../../src/modules/notifications/views/inbox-widget.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(busy \|\| unavailable\) return;\s*\/\/ A poll started before this mutation must not overwrite its result\.\s*requestId\.current\+\+;\s*setBusy\(true\);/);
  assert.match(source, /if \(currentRequest !== requestId\.current\) return;/);
});
