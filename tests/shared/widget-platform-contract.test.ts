import assert from "node:assert/strict";
import test from "node:test";
import { defineWidgets, resolveWidgets, type WidgetDefinition } from "../../src/shared/widgets/contract";

const bell: WidgetDefinition = {
  id: "notifications.bell", moduleId: "notifications", slot: "header.right",
  size: "compact", titleKey: "notifications.bell", defaultEnabled: true,
};

test("rejects duplicate IDs and invalid ownership", () => {
  assert.throws(() => defineWidgets("notifications", [bell, bell]), /Duplicate/);
  assert.throws(() => defineWidgets("tasks", [bell]), /ownership/);
});

test("preference cannot bypass permissions or module gating", () => {
  const enabled = [{ id: bell.id, enabled: true, order: 0 }];
  assert.deepEqual(resolveWidgets([bell], "header.right", enabled, () => false), []);
  assert.deepEqual(resolveWidgets([bell], "header.left", enabled, () => true), []);
});

test("mandatory controls ignore user hide; optional controls obey it", () => {
  const mandatory = { ...bell, mandatory: true };
  assert.equal(resolveWidgets([mandatory], "header.right", [{ id: bell.id, enabled: false, order: 0 }], () => true).length, 1);
  assert.equal(resolveWidgets([bell], "header.right", [{ id: bell.id, enabled: false, order: 0 }], () => true).length, 0);
});

test("stable order uses user preference then ID", () => {
  const tasks: WidgetDefinition = { ...bell, id: "tasks.quick", moduleId: "tasks" };
  const result = resolveWidgets([tasks, bell], "header.right", [
    { id: "tasks.quick", enabled: true, order: 0 },
    { id: bell.id, enabled: true, order: 1 },
  ], () => true);
  assert.deepEqual(result.map((w) => w.id), ["tasks.quick", "notifications.bell"]);
});
