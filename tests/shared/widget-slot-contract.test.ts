import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = readFileSync(join(process.cwd(), "src/shared/widgets/components/widget-slot.tsx"), "utf8");
const boundary = readFileSync(join(process.cwd(), "src/shared/widgets/components/widget-error-boundary.tsx"), "utf8");

test("slot uses centralized policy resolver rather than client-only preference gating", () => {
  assert.match(source, /resolveWidgets\(/);
  assert.match(source, /canView/);
  assert.match(source, /registry: readonly WidgetRegistration\[\]/);
});

test("slot isolates widget failures and lazy loads only trusted registered components", () => {
  assert.match(source, /WidgetErrorBoundary/);
  assert.match(source, /Suspense/);
  assert.match(source, /lazy\(load\)/);
  assert.doesNotMatch(source, /import\(.*preference/);
});

test("widget errors do not log potentially sensitive data", () => {
  assert.doesNotMatch(boundary, /console\.(log|error|warn)/);
  assert.match(boundary, /getDerivedStateFromError/);
});
