import assert from "node:assert/strict";
import test from "node:test";
import { editWidgetPreferences } from "../../src/shared/widgets/preference-operations";
import type { WidgetDefinition, WidgetPreference } from "../../src/shared/widgets/contract";

const definitions: WidgetDefinition[] = [
  { id: "system.required", moduleId: "system", slot: "header.right", size: "compact", titleKey: "required", mandatory: true },
  { id: "system.first", moduleId: "system", slot: "header.right", size: "compact", titleKey: "first", defaultEnabled: true },
  { id: "system.second", moduleId: "system", slot: "header.right", size: "compact", titleKey: "second", defaultEnabled: false },
  { id: "system.footer", moduleId: "system", slot: "footer", size: "compact", titleKey: "footer" },
];
const all = () => true;
const ids = (items: WidgetPreference[]) => items.map((item) => item.id);

test("WP4: denied widgets are not exposed or persisted, even when explicitly requested", () => {
  const result = editWidgetPreferences(definitions, [{ id: "system.second", enabled: true, order: 0 }],
    (widget) => widget.id !== "system.second", { type: "toggle", id: "system.second", enabled: true });
  assert.ok(!ids(result).includes("system.second"));
});

test("WP4: mandatory widgets cannot be hidden and reset restores trusted defaults", () => {
  const changed = editWidgetPreferences(definitions, [], all, { type: "toggle", id: "system.required", enabled: false });
  assert.equal(changed.find((item) => item.id === "system.required")?.enabled, true);
  const reset = editWidgetPreferences(definitions, changed, all, { type: "reset" });
  assert.equal(reset.find((item) => item.id === "system.first")?.enabled, true);
  assert.equal(reset.find((item) => item.id === "system.second")?.enabled, false);
});

test("WP4: reorder stays inside slot boundaries and preserves stable unique positions", () => {
  const initial = editWidgetPreferences(definitions, [], all, { type: "reset" });
  const moved = editWidgetPreferences(definitions, initial, all, { type: "move", id: "system.second", direction: -1 });
  assert.equal(ids(moved).indexOf("system.second"), ids(initial).indexOf("system.second") - 1);
  const boundary = editWidgetPreferences(definitions, moved, all, { type: "move", id: "system.footer", direction: -1 });
  assert.deepEqual(ids(boundary), ids(moved));
  assert.deepEqual(boundary.map((item) => item.order), [0, 1, 2, 3]);
});

test("WP4: malformed preferences and failed policy checks never grant access", () => {
  const malformed = [null, { id: "system.second", enabled: "true", order: 0 },
    { id: "system.first", enabled: true, order: Infinity }] as unknown as WidgetPreference[];
  const result = editWidgetPreferences(definitions, malformed, (widget) => {
    if (widget.id === "system.second") throw new Error("policy unavailable");
    return true;
  }, { type: "toggle", id: "system.second", enabled: true });
  assert.ok(!ids(result).includes("system.second"));
  assert.equal(result.find((item) => item.id === "system.first")?.enabled, true);
});

test("WP4: reset restores trusted registry order after a user reorders widgets", () => {
  const defaults = editWidgetPreferences(definitions, [], all, { type: "reset" });
  const customized = editWidgetPreferences(definitions, defaults, all, {
    type: "move", id: "system.second", direction: -1,
  });
  assert.notDeepEqual(ids(customized), ids(defaults));
  const restored = editWidgetPreferences(definitions, customized, all, { type: "reset" });
  assert.deepEqual(restored, defaults);
});

test("WP4: reset uses trusted priority and ignores manipulated stored order", () => {
  const priorityDefinitions: WidgetDefinition[] = [
    { id: "system.later", moduleId: "system", slot: "header.right", size: "compact", titleKey: "later", priority: 20 },
    { id: "system.earlier", moduleId: "system", slot: "header.right", size: "compact", titleKey: "earlier", priority: 5, defaultEnabled: true },
  ];
  const stored: WidgetPreference[] = [
    { id: "system.later", enabled: true, order: -100 },
    { id: "system.earlier", enabled: false, order: 100 },
  ];
  const restored = editWidgetPreferences(priorityDefinitions, stored, all, { type: "reset" });
  assert.deepEqual(ids(restored), ["system.earlier", "system.later"]);
  assert.deepEqual(restored.map((item) => item.enabled), [true, false]);
  assert.deepEqual(restored.map((item) => item.order), [0, 1]);
});

test("WP4: duplicate stored IDs cannot override trusted visibility or order", () => {
  const duplicate: WidgetPreference[] = [
    { id: "system.second", enabled: true, order: -999 },
    { id: "system.second", enabled: false, order: 999 },
  ];
  const result = editWidgetPreferences(definitions, duplicate, all, {
    type: "move", id: "system.footer", direction: -1,
  });
  assert.equal(result.find((item) => item.id === "system.second")?.enabled, false);
  assert.deepEqual(ids(result), ids(editWidgetPreferences(definitions, [], all, { type: "reset" })));
});
