import assert from "node:assert/strict";
import test from "node:test";

import { z } from "zod";

import { moduleNotificationRegistry } from "@/notification-registry";
import { definePermissions } from "@/shared/permissions/define";
import { defineNotificationType, defineNotificationTypes, isSafeNotificationHref, validateModuleNotifications } from "@/shared/notifications/define";

const permissions = definePermissions("demo", { ADMIN: ["view"], BOARD: [], SECRETARY: [], TREASURER: [], AUDITOR: [], TAX_ADVISOR: [], TEACHER: [], VIEWER: [] });
const valid = defineNotificationType({
  key: "assigned",
  severity: "info",
  defaultChannels: ["in_app", "email"],
  permission: { definition: permissions, action: "view" },
  schema: z.object({ taskId: z.string() }).strict(),
  titleKey: "notifications.assigned.title",
  href: (params) => `/tasks/${params.taskId}`,
});

test("notifications: sözleşme denetimi", () => {
  assert.deepEqual(validateModuleNotifications("tasks", defineNotificationTypes("tasks", [valid])), []);
  assert.ok(validateModuleNotifications("meetings", defineNotificationTypes("tasks", [valid])).length > 0, "modül adı eşleşmeli");
  assert.ok(validateModuleNotifications("tasks", defineNotificationTypes("tasks", [valid, valid])).some((e) => e.startsWith("duplicate")));
  assert.ok(validateModuleNotifications("tasks", defineNotificationTypes("tasks", [{ ...valid, key: "Bad Key" }])).some((e) => e.startsWith("invalid key")));
  assert.ok(validateModuleNotifications("tasks", defineNotificationTypes("tasks", [{ ...valid, titleKey: "x.title" }])).length > 0);
  assert.ok(validateModuleNotifications("tasks", defineNotificationTypes("tasks", [{ ...valid, defaultChannels: ["fax" as never] }])).length > 0);
});

test("notifications: bağlantılar yalnız uygulama içi", () => {
  assert.equal(isSafeNotificationHref("/tasks/abc"), true);
  for (const href of ["https://evil.test", "//evil.test", "/a?next=//x", "/a#x", "/a/../b", "/a%2f", "/", "javascript:alert(1)"]) assert.equal(isSafeNotificationHref(href), false, href);
});

test("notifications: kayıttaki tüm modül tanımları geçerli", () => {
  for (const entry of moduleNotificationRegistry) assert.deepEqual(validateModuleNotifications(entry.module, entry), [], entry.module);
});
