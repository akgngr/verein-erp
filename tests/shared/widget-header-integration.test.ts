import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const header = readFileSync(join(process.cwd(), "src/app/(dashboard)/_components/workspace-header.tsx"), "utf8");
const layout = readFileSync(join(process.cwd(), "src/app/(dashboard)/layout.tsx"), "utf8");
const mobile = readFileSync(join(process.cwd(), "src/app/(dashboard)/_components/sidebar.tsx"), "utf8");

test("WP2 header uses the generated trusted registry and generic header.right slot", () => {
  assert.match(header, /import \{ widgetRegistry \} from "@\/widget-registry"/);
  assert.match(header, /<WidgetSlot[\s\S]*?slot="header\.right"[\s\S]*?registry=\{widgetRegistry\}/);
  assert.doesNotMatch(header, /from ["']@\/modules\/notifications/);
});

test("WP2 header fails closed without server-derived widget authorization", () => {
  assert.match(header, /widgetAccess \? <HeaderWidgetSlot/);
  assert.match(header, /access\.allowedIds\.includes\(definition\.id\)/);
  assert.match(header, /preferences=\{access\.preferences\}/);
  assert.doesNotMatch(header, /canView=\{\(\) => true\}/);
});

test("WP2 dashboard resolves widget access on the server for both viewports", () => {
  assert.match(layout, /resolveWidgetsForUser\(user, activeModuleKeys\)/);
  assert.match(layout, /<WorkspaceHeader[\s\S]*widgetAccess=\{widgetAccess\}/);
  assert.match(layout, /<MobileHeader widgetAccess=\{widgetAccess\}/);
  assert.match(mobile, /<HeaderWidgetSlot access=\{widgetAccess\} mobile/);
  assert.match(header, /useSyncExternalStore\(subscribeViewport, isDesktop, serverViewport\)/);
});

test("WP2 first widget is a local system shortcut, independent of notifications", () => {
  const widget = readFileSync(join(process.cwd(), "src/modules/system/widget.ts"), "utf8");
  assert.match(widget, /defineModuleWidgets\("system"/);
  assert.match(widget, /requiredPermissions: \["settings:view"\]/);
  assert.match(widget, /load: \(\) => import\("\.\/widgets\/settings-shortcut"\)/);
  assert.doesNotMatch(widget, /from ["']@\/modules\/notifications|import\(["']\.\/notifications/);
});
