import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const ui = fs.readFileSync("src/modules/notifications/components/notification-bell-drawer.tsx", "utf8");
const entry = fs.readFileSync("src/modules/notifications/ui.ts", "utf8");

test("N1b drawer is kit-only and does not fabricate backend notifications", () => {
  assert.match(ui, /@\/shared\/components\/kit/);
  assert.doesNotMatch(ui, /@heroui\/react|fetch\(|setInterval\(|mockItems|demoItems|dangerouslySetInnerHTML/);
  assert.match(ui, /readonly NotificationDrawerItem\[\]/);
  assert.match(ui, /<Sheet .*placement="right"/);
  assert.match(ui, /onOpenChange=\{setOpen\}/);
  assert.match(entry, /NotificationBellDrawer/);
});
test("N1b has keyboard and error/empty semantics with disabled write controls", () => {
  assert.match(ui, /aria-pressed/);
  assert.match(ui, /role="alert"/);
  assert.match(ui, /role="status"/);
  assert.match(ui, /aria-busy/);
  assert.match(ui, /isDisabled=\{!onReadAll/);
  assert.match(ui, /isDisabled=\{!onRead \|\|/);
  assert.match(ui, /isDisabled=\{!onSnooze/);
});
test("N1b only renders validated internal source links", () => {
  assert.match(ui, /safeNotificationHref\(item.href\)/);
  assert.match(ui, /!value.startsWith\("\/\/"\)/);
  assert.match(ui, /segment === "\.\."|segment === "\."/);
  assert.match(ui, /count > 99 \? "99\+"/);
});

const adapter = fs.readFileSync("src/modules/notifications/views/inbox-widget.tsx", "utf8");

test("N1b polls only visible tabs and cleans up timers/listeners on unmount", () => {
  assert.match(adapter, /document\.visibilityState === "visible"/);
  assert.match(adapter, /document\.addEventListener\("visibilitychange", poll\)/);
  assert.match(adapter, /document\.removeEventListener\("visibilitychange", poll\)/);
  assert.match(adapter, /window\.clearInterval\(interval\)/);
  assert.match(adapter, /const POLL_MS = 30_000/);
});

test("N1b uses authenticated actions and fails closed on read or write errors", () => {
  assert.match(adapter, /listNotificationsAction\(\{ unreadOnly: false, limit: 50 \}\)/);
  assert.match(adapter, /unreadNotificationCountAction\(\{\}\)/);
  assert.match(adapter, /if \(!list\.ok \|\| !unread\.ok\) \{ setUnavailable\(true\); return; \}/);
  assert.match(adapter, /if \(!result\.ok\) \{ setUnavailable\(true\); return; \}/);
  assert.match(adapter, /onRead=\{\(id\) => act\(\(\) => markNotificationsReadAction/);
  assert.match(adapter, /onReadAll=\{\(\) => act\(\(\) => markAllNotificationsReadAction/);
  assert.match(adapter, /onSnooze=\{\(id\) => act\(\(\) => snoozeNotificationAction/);
  assert.doesNotMatch(adapter, /console\.(?:log|debug|info)|localStorage|sessionStorage/);
});
