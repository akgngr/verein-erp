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
