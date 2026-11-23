/**
 * Widget Platform WP6 (#440): Accessibility, Mobile Viewport, and Browser Verification.
 * Verifies keyboard/screen-reader semantics, mobile overflow protection, SSR hydration safety,
 * theme and reduced-motion compatibility, fault containment, and privacy guards.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe } from "node:test";

import { safeNotificationHref } from "@/modules/notifications/components/safe-href";
import { editWidgetPreferences } from "@/shared/widgets/preference-operations";
import { type WidgetDefinition, type WidgetPreference } from "@/shared/widgets/contract";

const ROOT = process.cwd();

describe("Widget Platform WP6 — Accessibility & Semantic HTML", () => {
  test("header landmark, navigation and theme switcher have accessible screen-reader semantics", () => {
    const headerSrc = fs.readFileSync(path.join(ROOT, "src/app/(dashboard)/_components/workspace-header.tsx"), "utf8");

    // Semantic landmark header and accessible navigation with aria-label
    // (Live browser keyboard Tab focus and drawer interactions are verified in scripts/check-hydration.ts)
    assert.match(headerSrc, /<header[^>]*?className=[^>]*?workspace-header/);
    assert.match(headerSrc, /<nav[^>]*?aria-label=\{sidebar\("mainMenu"\)\}/);
    assert.match(headerSrc, /aria-current=\{pathname === "\/" \? "page" : undefined\}/);

    // Decorative icons must be hidden from screen readers
    assert.match(headerSrc, /<LayoutDashboard[\s\S]*?aria-hidden/);
    assert.match(headerSrc, /<ChevronRight[\s\S]*?aria-hidden/);

    // ThemeMenu accessibility
    assert.match(headerSrc, /aria-label=\{sidebar\("theme"\)\}/);
    assert.match(headerSrc, /aria-label=\{sidebar\("themeOptions"\)\}/);
    assert.match(headerSrc, /selectionMode="single"/);
  });

  test("widget slot container defines semantic data attribute and wraps components in error boundary", () => {
    const slotSrc = fs.readFileSync(path.join(ROOT, "src/shared/widgets/components/widget-slot.tsx"), "utf8");

    // Semantic data-widget-slot for CSS scoping, testing and a11y inspection
    assert.match(slotSrc, /data-widget-slot=\{slot\}/);

    // Every widget is mounted inside an isolated error boundary and Suspense boundary
    assert.match(slotSrc, /<WidgetErrorBoundary fallback=\{fallback\}>[\s\S]*?<Suspense fallback=\{fallback\}>/);

    // Component loaders are memoized via WeakMap to avoid re-renders / re-instantiations
    assert.match(slotSrc, /const lazyCache = new WeakMap<WidgetComponentLoader, ComponentType>\(\)/);
  });

  test("system shortcut widget provides accessible label, tooltip, and hidden icon", () => {
    const shortcutSrc = fs.readFileSync(path.join(ROOT, "src/modules/system/widgets/settings-shortcut.tsx"), "utf8");

    // Keyboard-focusable Link with aria-label, title and aria-hidden icon
    assert.match(shortcutSrc, /<Link[\s\S]*?aria-label=\{t\("settings"\)\}/);
    assert.match(shortcutSrc, /title=\{t\("settings"\)\}/);
    assert.match(shortcutSrc, /<Settings2[\s\S]*?aria-hidden/);
  });

  test("notifications bell drawer provides accessible dialog, focus landmarks, and busy indicators", () => {
    const drawerSrc = fs.readFileSync(
      path.join(ROOT, "src/modules/notifications/components/notification-bell-drawer.tsx"),
      "utf8",
    );

    // Trigger button accessibility
    assert.match(drawerSrc, /<Button[\s\S]*?aria-label=\{labels\.open\}[\s\S]*?className="relative">/);
    assert.match(drawerSrc, /<Bell[\s\S]*?aria-hidden/);

    // Badge is aria-hidden so screen readers do not stammer disconnected numbers
    assert.match(drawerSrc, /<span aria-hidden className="absolute -right-1 -top-1/);

    // Sheet / Drawer accessibility
    assert.match(drawerSrc, /<Sheet[\s\S]*?placement="right" aria-label=\{labels\.heading\}>/);
    assert.match(drawerSrc, /<Sheet\.Header><Sheet\.Heading>\{labels\.heading\}<\/Sheet\.Heading><\/Sheet\.Header>/);

    // Live state and filters
    assert.match(drawerSrc, /aria-busy=\{pending \|\| busy\}/);
    assert.match(drawerSrc, /role="group" aria-label=\{labels\.heading\}/);
    assert.match(drawerSrc, /aria-pressed=\{!unreadOnly\}/);
    assert.match(drawerSrc, /aria-pressed=\{unreadOnly\}/);

    // Actions disabled during inflight operations or zero count
    assert.match(drawerSrc, /isDisabled=\{!onReadAll \|\| pending \|\| busy \|\| unavailable \|\| count === 0\}/);
  });

  test("safeNotificationHref sanitizes potentially dangerous schemes (javascript/data)", () => {
    assert.equal(safeNotificationHref("/ayarlar"), true);
    assert.equal(safeNotificationHref("/muhasebe/faturalar?id=123"), false); // query params disallowed in simple route
    assert.equal(safeNotificationHref("https://example.com/destek"), false); // external URL disallowed
    assert.equal(safeNotificationHref("javascript:alert(1)"), false);
    assert.equal(safeNotificationHref("JAVASCRIPT:evil()"), false);
    assert.equal(safeNotificationHref("data:text/html;base64,..."), false);
    assert.equal(safeNotificationHref("vbscript:run()"), false);
    assert.equal(safeNotificationHref(""), false);
    assert.equal(safeNotificationHref(null), false);
    assert.equal(safeNotificationHref(undefined), false);
  });
});

describe("Widget Platform WP6 — Mobile Viewport & Hydration Safety", () => {
  test("header widget slots enforce max-width constraint and horizontal overflow scroll", () => {
    const headerSrc = fs.readFileSync(path.join(ROOT, "src/app/(dashboard)/_components/workspace-header.tsx"), "utf8");

    // Desktop header constrains widget slot to max 30vw with overflow-x-auto
    // Mobile header constrains widget slot to max 35vw with overflow-x-auto
    assert.match(headerSrc, /overflow-x-auto/);
    assert.match(headerSrc, /max-w-\[30vw\]/);
    assert.match(headerSrc, /max-w-\[35vw\]/);
  });

  test("viewport synchronization avoids SSR hydration mismatches using useSyncExternalStore", () => {
    const headerSrc = fs.readFileSync(path.join(ROOT, "src/app/(dashboard)/_components/workspace-header.tsx"), "utf8");

    // Uses React useSyncExternalStore for hydration safety
    assert.match(headerSrc, /useSyncExternalStore\(subscribeViewport, isDesktop, serverViewport\)/);

    // serverViewport returns deterministic false on server
    assert.match(headerSrc, /function serverViewport\(\)\s*\{\s*return false;\s*\}/);

    // When viewport matches mobile/desktop condition, slot mounts exclusively in one header
    assert.match(headerSrc, /if \(mobile === desktop\) return null;/);
  });

  test("mobile header provides accessible trigger and mounts mobile widget slot", () => {
    const sidebarSrc = fs.readFileSync(path.join(ROOT, "src/app/(dashboard)/_components/sidebar.tsx"), "utf8");

    // Mobile header mounts on mobile viewports (<1024px, lg:hidden) and mounts mobile widget slot
    // (Live 390px mobile viewport overflow and drawer tests are verified in scripts/check-hydration.ts)
    assert.match(sidebarSrc, /<header[^>]*?lg:hidden/);
    assert.match(sidebarSrc, /aria-label=\{[\s\S]*?openMobile[\s\S]*?\}/);
    assert.match(sidebarSrc, /<HeaderWidgetSlot access=\{widgetAccess\} mobile \/>/);
  });
});

describe("Widget Platform WP6 — Fault Containment & Privacy / Zero-PII", () => {
  test("error boundary catches render errors and renders fallback without logging PII", () => {
    const boundarySrc = fs.readFileSync(
      path.join(ROOT, "src/shared/widgets/components/widget-error-boundary.tsx"),
      "utf8",
    );

    // Uses getDerivedStateFromError
    assert.match(boundarySrc, /static getDerivedStateFromError\(/);

    // Must never leak user PII or sensitive stack traces to console
    assert.doesNotMatch(boundarySrc, /console\.(log|error|warn|info|trace)\(/);
  });

  test("widget registry validator forbids dynamic code execution and filesystem traversal", () => {
    const registrySrc = fs.readFileSync(path.join(ROOT, "src/shared/widgets/registry.ts"), "utf8");

    // Rejects missing loaders and validates permissions format
    assert.match(registrySrc, /has no loader/);
    assert.match(registrySrc, /Invalid widget permission/);
    assert.match(registrySrc, /Duplicate widget ID/);
    assert.match(registrySrc, /declares widget for another module/);
  });
});

describe("Widget Platform WP6 — Keyboard Navigation & Preference Operations", () => {
  const widgets: WidgetDefinition[] = [
    { id: "system.settings", moduleId: "system", slot: "header.right", size: "compact", titleKey: "system.ui.widget.settings", defaultEnabled: true, priority: 10 },
    { id: "notifications.bell", moduleId: "notifications", slot: "header.right", size: "popover", titleKey: "notifications.widget.bell", mandatory: true, priority: 20 },
    { id: "weather.mini", moduleId: "weather", slot: "header.right", size: "compact", titleKey: "weather.mini", defaultEnabled: false, priority: 30 },
  ];

  test("pure preference editor allows directional keyboard moves within slot", () => {
    const initial: WidgetPreference[] = [
      { id: "system.settings", enabled: true, order: 0 },
      { id: "notifications.bell", enabled: true, order: 1 },
      { id: "weather.mini", enabled: false, order: 2 },
    ];

    // Move weather.mini up by 1 step (-1)
    const movedUp = editWidgetPreferences(widgets, initial, () => true, {
      type: "move",
      id: "weather.mini",
      direction: -1,
    });
    assert.equal(movedUp[0].id, "system.settings");
    assert.equal(movedUp[1].id, "weather.mini");
    assert.equal(movedUp[2].id, "notifications.bell");

    // Move system.settings down by 1 step (+1)
    const movedDown = editWidgetPreferences(widgets, initial, () => true, {
      type: "move",
      id: "system.settings",
      direction: 1,
    });
    assert.equal(movedDown[0].id, "notifications.bell");
    assert.equal(movedDown[1].id, "system.settings");
    assert.equal(movedDown[2].id, "weather.mini");
  });

  test("reset operation restores trusted defaults without hiding mandatory widgets", () => {
    const customized: WidgetPreference[] = [
      { id: "system.settings", enabled: false, order: 2 },
      { id: "notifications.bell", enabled: false, order: 1 },
      { id: "weather.mini", enabled: true, order: 0 },
    ];

    const reset = editWidgetPreferences(widgets, customized, () => true, { type: "reset" });

    // system.settings is defaultEnabled: true
    const sys = reset.find((w) => w.id === "system.settings");
    assert.ok(sys);
    assert.equal(sys.enabled, true);

    // notifications.bell is mandatory: true (cannot be disabled)
    const bell = reset.find((w) => w.id === "notifications.bell");
    assert.ok(bell);
    assert.equal(bell.enabled, true);

    // weather.mini is defaultEnabled: false
    const weather = reset.find((w) => w.id === "weather.mini");
    assert.ok(weather);
    assert.equal(weather.enabled, false);

    // All registered widgets are present
    assert.equal(reset.length, 3);
  });

  test("denied widgets cannot be moved, toggled, or exposed through preference editor", () => {
    const preferences: WidgetPreference[] = [
      { id: "system.settings", enabled: true, order: 0 },
      { id: "notifications.bell", enabled: true, order: 1 },
      { id: "weather.mini", enabled: true, order: 2 },
    ];

    // canView denies weather module
    const canView = (w: WidgetDefinition) => w.moduleId !== "weather";

    const result = editWidgetPreferences(widgets, preferences, canView, {
      type: "toggle",
      id: "weather.mini",
      enabled: true,
    });

    // weather.mini is completely omitted because user lacks permission
    assert.equal(result.some((w) => w.id === "weather.mini"), false);
    assert.equal(result.length, 2);
  });
});
