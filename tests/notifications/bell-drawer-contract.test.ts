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
