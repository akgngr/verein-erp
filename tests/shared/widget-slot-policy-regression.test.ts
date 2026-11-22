import assert from "node:assert/strict";
import test from "node:test";
import { resolveWidgets, type WidgetDefinition, type WidgetPreference } from "../../src/shared/widgets/contract";

const widgets: WidgetDefinition[] = [
  { id: "system.required", moduleId: "system", slot: "header.right", size: "compact", titleKey: "required", mandatory: true },
  { id: "system.optional", moduleId: "system", slot: "header.right", size: "compact", titleKey: "optional", defaultEnabled: true },
  { id: "system.disabled", moduleId: "system", slot: "header.right", size: "compact", titleKey: "disabled", defaultEnabled: false },
  { id: "system.other", moduleId: "system", slot: "footer", size: "compact", titleKey: "other", defaultEnabled: true },
];

test("WP2: client preferences cannot enable widgets denied by server policy", () => {
  const preferences: WidgetPreference[] = widgets.map((widget, order) => ({
    id: widget.id, enabled: true, order,
  }));
  const result = resolveWidgets(widgets, "header.right", preferences, (widget) => widget.id !== "system.optional");
  assert.deepEqual(result.map((widget) => widget.id), ["system.required", "system.disabled"]);
});

test("WP2: mandatory widgets ignore hide preferences but not authorization", () => {
  const preferences: WidgetPreference[] = [{ id: "system.required", enabled: false, order: 0 }];
  assert.deepEqual(
    resolveWidgets(widgets, "header.right", preferences, () => true).map((widget) => widget.id),
    ["system.required", "system.optional"],
  );
  assert.deepEqual(
    resolveWidgets(widgets, "header.right", preferences, (widget) => widget.id !== "system.required")
      .map((widget) => widget.id),
    ["system.optional"],
  );
});

test("WP2: widget placement cannot be changed by stored preferences", () => {
  const preferences: WidgetPreference[] = [{ id: "system.other", enabled: true, order: -100 }];
  assert.deepEqual(
    resolveWidgets(widgets, "header.right", preferences, () => true).map((widget) => widget.id),
    ["system.optional", "system.required"],
  );
});

test("WP2: unknown preference IDs do not create executable widgets", () => {
  const preferences: WidgetPreference[] = [{ id: "evil.remote", enabled: true, order: -999 }];
  assert.deepEqual(
    resolveWidgets(widgets, "header.right", preferences, () => true).map((widget) => widget.id),
    ["system.optional", "system.required"],
  );
});

test("WP2: stable order uses preference order and widget ID tie-breaker", () => {
  const preferences: WidgetPreference[] = [
    { id: "system.optional", enabled: true, order: 1 },
    { id: "system.required", enabled: true, order: 1 },
  ];
  assert.deepEqual(
    resolveWidgets(widgets, "header.right", preferences, () => true).map((widget) => widget.id),
    ["system.optional", "system.required"],
  );
});

test("WP2: malformed preference order never changes trusted widget ordering", () => {
  const preferences = [
    { id: "system.required", enabled: true, order: Number.NaN },
    { id: "system.optional", enabled: true, order: Number.NEGATIVE_INFINITY },
    { id: "system.disabled", enabled: true, order: 0.5 },
  ] as WidgetPreference[];
  assert.deepEqual(
    resolveWidgets(widgets, "header.right", preferences, () => true).map((widget) => widget.id),
    ["system.optional", "system.required"],
  );
});

test("WP2: conflicting duplicate preferences fail closed instead of last-write-wins", () => {
  const preferences: WidgetPreference[] = [
    { id: "system.disabled", enabled: false, order: 0 },
    { id: "system.disabled", enabled: true, order: -1 },
    { id: "system.required", enabled: false, order: 0 },
    { id: "system.required", enabled: true, order: 1 },
  ];
  assert.deepEqual(
    resolveWidgets(widgets, "header.right", preferences, () => true).map((widget) => widget.id),
    ["system.optional", "system.required"],
  );
});

test("WP2: malformed preference flags cannot enable disabled-by-default widgets", () => {
  const preferences = [
    { id: "system.disabled", enabled: "true", order: 0 },
    { id: "system.optional", enabled: false, order: 1 },
  ] as unknown as WidgetPreference[];
  assert.deepEqual(
    resolveWidgets(widgets, "header.right", preferences, () => true).map((widget) => widget.id),
    ["system.required"],
  );
});
