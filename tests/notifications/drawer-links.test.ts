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
  assert.match(source, /isDisabled=\{!onReadAll \|\| pending \|\| busy \|\| count === 0\}/);
  assert.match(source, /isDisabled=\{!onRead \|\| pending \|\| busy\}/);
  assert.match(source, /isDisabled=\{!onSnooze \|\| pending \|\| busy\}/);
  assert.match(source, /role="alert"/);
  assert.match(source, /aria-busy=\{pending \|\| busy\}/);
  assert.match(source, /safeNotificationHref\(item\.href\)/);
  assert.doesNotMatch(source, /demoNotifications|mockNotifications|localStorage/);
});
