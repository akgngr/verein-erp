import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import {
  emitNotificationUpdate,
  subscribeNotificationUpdates,
} from "@/modules/notifications/services/stream-bus";

test("stream-bus invokes listener per userId and maintains strict isolation", () => {
  let user1Calls = 0;
  let user2Calls = 0;

  const unsub1 = subscribeNotificationUpdates("user-1", () => {
    user1Calls++;
  });
  const unsub2 = subscribeNotificationUpdates("user-2", () => {
    user2Calls++;
  });

  emitNotificationUpdate("user-1");
  assert.equal(user1Calls, 1);
  assert.equal(user2Calls, 0);

  emitNotificationUpdate("user-2");
  assert.equal(user1Calls, 1);
  assert.equal(user2Calls, 1);

  unsub1();
  emitNotificationUpdate("user-1");
  assert.equal(user1Calls, 1); // no longer called

  unsub2();
});

test("stream route contract: authentication, authorization, event-stream headers, and zero PII", () => {
  const routeSource = fs.readFileSync("src/modules/notifications/api/stream/route.ts", "utf8");

  // Route configuration
  assert.match(routeSource, /export const runtime = "nodejs"/);
  assert.match(routeSource, /export const dynamic = "force-dynamic"/);

  // Authentication & permission check
  assert.match(routeSource, /await getCurrentUser\(\)/);
  assert.match(routeSource, /status:\s*401/);
  assert.match(routeSource, /can\(user\.role,\s*notificationsPermissions,\s*"view"\)/);
  assert.match(routeSource, /status:\s*403/);

  // Response headers
  assert.match(routeSource, /"Content-Type":\s*"text\/event-stream;\s*charset=utf-8"/);
  assert.match(routeSource, /"Cache-Control":\s*"no-cache,\s*no-transform"/);
  assert.match(routeSource, /"Connection":\s*"keep-alive"/);
  assert.match(routeSource, /"X-Accel-Buffering":\s*"no"/);

  // SSE event structure
  assert.match(routeSource, /send\("count",/);
  assert.match(routeSource, /send\("update",/);
  assert.match(routeSource, /sendComment\("keepalive"\)/);

  // Lifecycle & cleanup
  assert.match(routeSource, /request\.signal\.addEventListener\("abort"/);
  assert.match(routeSource, /unsubscribeBus\(\)/);

  // Strict privacy: Zero personal data (PII) transmitted over SSE
  assert.doesNotMatch(routeSource, /user\.email|user\.name|dbUser|password|token|paramsEnc/);
});

test("inbox-widget implements SSE with automatic fallback to polling and visibility management", () => {
  const widgetSource = fs.readFileSync("src/modules/notifications/views/inbox-widget.tsx", "utf8");

  // SSE initialization
  assert.match(widgetSource, /new EventSource\("\/api\/notifications\/stream"\)/);
  assert.match(widgetSource, /eventSource\.onopen = \(\) =>/);
  assert.match(widgetSource, /eventSource\.addEventListener\("count"/);
  assert.match(widgetSource, /eventSource\.addEventListener\("update"/);

  // Fallback to polling on error or disconnection
  assert.match(widgetSource, /eventSource\.onerror = \(\) =>/);
  assert.match(widgetSource, /if \(!sseActive\) poll\(\)/);

  // Tab visibility: pauses when hidden, reconnects when visible
  assert.match(widgetSource, /const handleVisibility = \(\) =>/);
  assert.match(widgetSource, /if \(document\.visibilityState === "visible"\)/);
  assert.match(widgetSource, /disconnectSSE\(\)/);
  assert.match(widgetSource, /document\.addEventListener\("visibilitychange", handleVisibility\)/);
  assert.match(widgetSource, /document\.removeEventListener\("visibilitychange", handleVisibility\)/);
});

test("notification-bell-drawer adheres to WAI-ARIA and screen reader requirements", () => {
  const drawerSource = fs.readFileSync(
    "src/modules/notifications/components/notification-bell-drawer.tsx",
    "utf8",
  );

  // Trigger button a11y
  assert.match(drawerSource, /aria-haspopup="dialog"/);
  assert.match(drawerSource, /aria-expanded=\{open\}/);
  assert.match(
    drawerSource,
    /aria-label=\{count > 0 \? `\$\{labels\.open\} \(\$\{count > 99 \? "99\+" : count\} \$\{labels\.unread\}\)` : labels\.open\}/,
  );

  // Live status announcements
  assert.match(drawerSource, /role="status"/);
  assert.match(drawerSource, /aria-live="polite"/);
  assert.match(drawerSource, /aria-atomic="true"/);

  // Unread badge indicator for screen readers
  assert.match(
    drawerSource,
    /item\.unread \? <span className="sr-only">\[\{labels\.unread\}\] <\/span> : null/,
  );

  // Contextual action button labels for screen readers
  assert.match(drawerSource, /aria-label=\{`\$\{labels\.markRead\}: \$\{item\.title\}`\}/);
  assert.match(drawerSource, /aria-label=\{`\$\{labels\.snooze\}: \$\{item\.title\}`\}/);
});
