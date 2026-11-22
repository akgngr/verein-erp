/** Widget Platform WP3 (#437): preference sanitising, admin policy precedence, settings contract, DB isolation. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { describe } from "node:test";

import { allowedAfterPolicy, buildSettingsRows, sanitizePreferences } from "@/modules/widgets/services/preferences";
import { getDb } from "@/shared/db";
import { defineModuleWidgets } from "@/shared/widgets/registry";

const load = async () => ({ default: () => null });
const registry = [
  ...defineModuleWidgets("notifications", [{ id: "notifications.bell", slot: "header.right", size: "popover", titleKey: "n.bell", mandatory: true, priority: 10, load }]),
  ...defineModuleWidgets("help-center", [{ id: "help-center.help", slot: "header.right", size: "popover", titleKey: "h.help", defaultEnabled: true, priority: 20, load }]),
  ...defineModuleWidgets("weather", [{ id: "weather.mini", slot: "header.right", size: "compact", titleKey: "w.mini", priority: 30, load }]),
];

describe("widget preferences (pure)", () => {
  test("sanitize: unknown IDs, bad values and duplicates dropped; mandatory forced on", () => {
    const out = sanitizePreferences([
      { id: "notifications.bell", enabled: false, order: 1 },
      { id: "weather.mini", enabled: true, order: 2 },
      { id: "weather.mini", enabled: false, order: 3 },
      { id: "evil.script", enabled: true, order: 0 },
      { id: "help-center.help", enabled: "yes", order: 1 },
      { id: "help-center.help", enabled: true, order: 1.5 },
      { id: "help-center.help", enabled: true, order: -1 },
    ], registry);
    assert.deepEqual(out, [{ id: "notifications.bell", enabled: true, order: 1 }, { id: "weather.mini", enabled: true, order: 2 }]);
  });

  test("policy: admin can hide optional widgets, never mandatory ones", () => {
    const visible = ["notifications.bell", "help-center.help", "weather.mini"];
    const policies = [{ widgetId: "notifications.bell", disabled: true }, { widgetId: "weather.mini", disabled: true }];
    assert.deepEqual(allowedAfterPolicy(visible, policies, registry), ["notifications.bell", "help-center.help"]);
  });

  test("settings rows: only visible widgets; adminDisabled shown read-only; preference order wins", () => {
    const rows = buildSettingsRows({
      registry,
      visibleIds: ["notifications.bell", "help-center.help", "weather.mini"],
      policies: [{ widgetId: "weather.mini", disabled: true }],
      preferences: [{ id: "help-center.help", enabled: false, order: 1 }],
    });
    assert.deepEqual(rows.map((row) => [row.id, row.enabled, row.adminDisabled, row.order]), [
      ["help-center.help", false, false, 1],
      ["notifications.bell", true, false, 10],
      ["weather.mini", false, true, 30],
    ]);
    assert.equal(buildSettingsRows({ registry, visibleIds: [], policies: [], preferences: [] }).length, 0, "unusable module → no row");
  });
});

const enabled = Boolean(process.env.AI_TEST_DATABASE_URL);
if (enabled && process.env.DATABASE_URL !== process.env.AI_TEST_DATABASE_URL) throw new Error("AI_TEST_DATABASE_URL must match the isolated DATABASE_URL");

test("db: preferences are per user, replace atomically, reset and lifecycle delete", { skip: !enabled }, async () => {
  const { saveUserPreferences, loadUserPreferences, resetUserPreferences, setPolicy, loadPolicies } = await import("@/modules/widgets/services/store");
  const { lifecycle } = await import("@/modules/widgets/lifecycle");
  const a = `wa-${randomUUID()}`;
  const b = `wb-${randomUUID()}`;
  try {
    await saveUserPreferences(a, [{ id: "weather.mini", enabled: true, order: 1 }, { id: "evil.x", enabled: true, order: 0 }], registry);
    await saveUserPreferences(b, [{ id: "help-center.help", enabled: false, order: 5 }], registry);
    assert.deepEqual(await loadUserPreferences(a), [{ id: "weather.mini", enabled: true, order: 1 }]);
    await saveUserPreferences(a, [{ id: "help-center.help", enabled: true, order: 2 }], registry);
    assert.deepEqual(await loadUserPreferences(a), [{ id: "help-center.help", enabled: true, order: 2 }], "replaced, not merged");
    assert.deepEqual(await loadUserPreferences(b), [{ id: "help-center.help", enabled: false, order: 5 }], "other user untouched");
    await resetUserPreferences(a);
    assert.deepEqual(await loadUserPreferences(a), []);
    assert.equal(await setPolicy("notifications.bell", true, registry), false, "mandatory refused");
    assert.equal(await setPolicy("unknown.w", true, registry), false, "unknown refused");
    assert.equal(await setPolicy("weather.mini", true, registry), true);
    assert.ok((await loadPolicies()).some((row) => row.widgetId === "weather.mini" && row.disabled));
    await lifecycle.onUserDeleted!(b);
    assert.deepEqual(await loadUserPreferences(b), []);
  } finally {
    await getDb().widgetUserPreference.deleteMany({ where: { userId: { in: [a, b] } } });
    await getDb().widgetPolicy.deleteMany({ where: { widgetId: "weather.mini" } });
  }
});
