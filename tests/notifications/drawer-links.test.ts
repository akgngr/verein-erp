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
