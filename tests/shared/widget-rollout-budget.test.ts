import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

import { resolveWidgets, type WidgetDefinition } from "@/shared/widgets/contract";
import { buildWidgetRegistry, defineModuleWidgets } from "@/shared/widgets/registry";

const read = (path: string) => readFileSync(path, "utf8");

describe("WP7 rollout budgets", () => {
  test("100 definitions resolve 200 times under the render policy budget", () => {
    const definitions: WidgetDefinition[] = Array.from({ length: 100 }, (_, index) => ({
      id: `system.widget${index}`, moduleId: "system", slot: "header.right", size: "compact",
      titleKey: `widget.${index}`, defaultEnabled: true, priority: index,
    }));
    // Warm the runtime before measuring to reduce JIT and import noise. This is a
    // resolver budget, not a browser paint/LCP claim; CI remains the release gate.
    for (let index = 0; index < 20; index++) resolveWidgets(definitions, "header.right", [], () => true);
    const start = performance.now();
    for (let index = 0; index < 200; index++) {
      assert.equal(resolveWidgets(definitions, "header.right", [], () => true).length, 100);
    }
    assert.ok(performance.now() - start < 1_000, "widget policy resolution exceeded 1 s / 200 iterations on CI");
  });

  test("build-time registry and denied widgets never invoke loaders or request the network", () => {
    let loads = 0;
    const registrations = defineModuleWidgets("system", [{
      id: "system.example", slot: "header.right", size: "compact", titleKey: "example",
      defaultEnabled: true, load: async () => { loads++; return { default: () => null }; },
    }]);
    const registry = buildWidgetRegistry([{ module: "system", widgets: registrations }]);
    assert.deepEqual(resolveWidgets(registry.map((entry) => entry.definition), "header.right", [], () => false), []);
    assert.equal(loads, 0, "registration and denied resolution must have zero loader/network work");
    const slot = read("src/shared/widgets/components/widget-slot.tsx");
    assert.match(slot, /if \(!definitions\.length\) return null;/);
    assert.match(slot, /lazy\(load\)/);
    assert.doesNotMatch(slot, /fetch\(|new EventSource\(|new WebSocket\(/);
  });

  test("notification bell network budget: two initial reads, one same-origin stream, bounded visible polling", () => {
    const widget = read("src/modules/notifications/views/inbox-widget.tsx");
    const registration = read("src/modules/notifications/widget.ts");
    const poll = Number(widget.match(/const POLL_MS = ([\d_]+);/)?.[1].replaceAll("_", ""));
    const safetyPoll = Number(widget.match(/const SSE_SAFETY_POLL_MS = ([\d_]+);/)?.[1].replaceAll("_", ""));
    assert.ok(poll >= 30_000, "fallback must not poll faster than twice per minute");
    assert.ok(safetyPoll >= 90_000, "stream safety poll must not run faster than once per 90 seconds");
    assert.match(widget, /Promise\.all\(\[\s*listNotificationsAction\([^\n]*\),\s*unreadNotificationCountAction\(/);
    assert.match(widget, /document\.visibilityState === "visible"/);
    assert.match(widget, /new EventSource\("\/api\/notifications\/stream"\)/);
    assert.match(widget, /eventSource\.close\(\)/);
    assert.doesNotMatch(registration, /fetch\(|EventSource|listNotificationsAction|unreadNotificationCountAction/);
  });

  test("fault and observability paths contain no user payload or external endpoint", () => {
    const boundary = read("src/shared/widgets/components/widget-error-boundary.tsx");
    const host = read("src/shared/widgets/components/widget-slot.tsx");
    assert.match(host, /<WidgetErrorBoundary fallback=\{fallback\}>/);
    assert.doesNotMatch(boundary + host, /console\.|recordEgress|https?:\/\/|JSON\.stringify\(.*(?:user|error)/);
  });
});
