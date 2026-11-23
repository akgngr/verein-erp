import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { discoverRoutes } from "../../scripts/check-hydration";

const read = (path: string) => fs.readFileSync(path, "utf8");

test("N8b SubscribersView is gated by notifications:update permission", () => {
  const view = read("src/modules/notifications/views/subscribers-view.tsx");
  assert.match(view, /requirePermission\(notificationsPermissions,\s*"update"\)/);
  assert.match(view, /ForbiddenError/);
  assert.match(view, /<AccessDenied/);
  assert.match(view, /<SubscribersManager\s+idPrefix="notifications-subscribers"/);
});

test("N8b SubscribersManager uses kit components, N8a actions, deterministic idPrefix, and zero PII logging", () => {
  const ui = read("src/modules/notifications/components/subscribers-manager.tsx");
  assert.match(ui, /from "@\/shared\/components\/kit"/);
  assert.match(ui, /listNotificationSubscribersAction\(/);
  assert.match(ui, /removeSubscriberChannelAction\(/);
  assert.match(ui, /if \(!result\.ok\)/);
  assert.match(ui, /idPrefix = "notifications-subscribers"/);
  assert.match(ui, /\$\{idPrefix\}-search/);
  assert.match(ui, /\$\{idPrefix\}-channel/);
  assert.match(ui, /\$\{idPrefix\}-row-/);
  assert.match(ui, /<StatCard/);
  assert.match(ui, /<StatusChip/);
  assert.match(ui, /<Table/);
  assert.match(ui, /<Dialog/);
  assert.doesNotMatch(ui, /@heroui\/react|dangerouslySetInnerHTML|mockData|console\.log/);
});

test("N8b route, nav entry, hydration route discovery, and TR/DE i18n are wired", () => {
  const route = read("src/modules/notifications/routes/aboneler/page.tsx");
  assert.match(route, /<SubscribersView/);

  const syncedRoute = "src/app/(dashboard)/(modules)/ayarlar/bildirimler/aboneler/page.tsx";
  assert.ok(fs.existsSync(syncedRoute), "Synced route page must exist after module:sync");

  const hydrationRoutes = discoverRoutes();
  assert.ok(
    hydrationRoutes.includes("/ayarlar/bildirimler/aboneler"),
    "Hydration route discovery must include /ayarlar/bildirimler/aboneler",
  );

  const config = read("src/modules/notifications/module.config.ts");
  assert.match(config, /href:\s*"\/ayarlar\/bildirimler\/aboneler"/);
  assert.match(config, /labelKey:\s*"aboneler"/);

  const tr = JSON.parse(read("src/modules/notifications/messages/tr.json"));
  const de = JSON.parse(read("src/modules/notifications/messages/de.json"));
  assert.deepEqual(
    Object.keys(tr.ui.subscribers).sort(),
    Object.keys(de.ui.subscribers).sort(),
  );
  assert.equal(typeof tr.nav.aboneler, "string");
  assert.equal(typeof de.nav.aboneler, "string");
});
