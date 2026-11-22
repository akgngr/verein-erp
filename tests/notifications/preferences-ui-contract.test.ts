import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("N2b saves user preferences through permission-gated actions only", () => {
  const ui = read("src/modules/notifications/components/preferences-form.tsx");
  assert.match(ui, /getMyNotificationPreferencesAction\(/);
  assert.match(ui, /saveMyNotificationPreferencesAction\(/);
  assert.match(ui, /saveMyNotificationSettingsAction\(/);
  assert.match(ui, /if \(!result\.ok\)/);
  assert.match(ui, /<table/);
  assert.match(ui, /<caption/);
  assert.match(ui, /scope="row"/);
  assert.match(ui, /inApp/);
  assert.doesNotMatch(ui, /@heroui\/react|dangerouslySetInnerHTML|mockData/);
});

test("N2b allows token write only and safe Telegram link handling", () => {
  const ui = read("src/modules/notifications/components/channel-links.tsx");
  assert.match(ui, /saveTelegramChannelAction/);
  assert.match(ui, /type="password"/);
  assert.match(ui, /autoComplete="new-password"/);
  assert.match(ui, /telegramLinkStatusAction/);
  assert.match(ui, /requestTelegramLinkAction/);
  assert.match(ui, /revokeTelegramLinkAction/);
  assert.doesNotMatch(ui, /@heroui\/react|tokenValue|dangerouslySetInnerHTML/);
});

test("N2b route is permission-gated and localized in both languages", () => {
  const page = read("src/modules/notifications/page.tsx");
  assert.match(page, /requirePermission\(notificationsPermissions, "view"\)/);
  assert.match(page, /<NotificationPreferencesForm/);
  assert.match(page, /<NotificationChannelLinks/);
  const tr = JSON.parse(read("src/modules/notifications/messages/tr.json"));
  const de = JSON.parse(read("src/modules/notifications/messages/de.json"));
  assert.deepEqual(Object.keys(tr.ui).sort(), Object.keys(de.ui).sort());
  assert.equal(typeof tr.nav.notifications, "string");
  assert.equal(typeof de.nav.notifications, "string");
});
