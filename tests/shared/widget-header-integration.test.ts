import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const header = readFileSync(join(process.cwd(), "src/app/(dashboard)/_components/workspace-header.tsx"), "utf8");

test("WP2 header uses the generated trusted registry and generic header.right slot", () => {
  assert.match(header, /import \{ widgetRegistry \} from "@\/widget-registry"/);
  assert.match(header, /<WidgetSlot[\s\S]*?slot="header\.right"[\s\S]*?registry=\{widgetRegistry\}/);
  assert.doesNotMatch(header, /from ["']@\/modules\/notifications/);
});

test("WP2 header fails closed without server-derived widget authorization", () => {
  assert.match(header, /widgetAccess \? \(/);
  assert.match(header, /widgetAccess\.allowedIds\.includes\(definition\.id\)/);
  assert.match(header, /preferences=\{widgetAccess\.preferences\}/);
  assert.doesNotMatch(header, /canView=\{\(\) => true\}/);
});


test("WP2 denied or disabled widget collections do not mount an empty header host", () => {
  const slot = readFileSync(join(process.cwd(), "src/shared/widgets/components/widget-slot.tsx"), "utf8");
  assert.match(slot, /if \(definitions\.length === 0\) return null;/);
  assert.ok(slot.indexOf("if (definitions.length === 0) return null;") < slot.indexOf("return ("));
});
