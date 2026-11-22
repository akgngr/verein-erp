/** Widget Platform WP1 (#435): module contract, registry validation, generator, server visibility. */
import assert from "node:assert/strict";
import fs from "node:fs";
import test, { describe } from "node:test";

import { visibleWidgetIds } from "@/modules/widgets/services/visibility";
import { definePermissions } from "@/shared/permissions/define";
import { buildWidgetRegistry, defineModuleWidgets, validateWidgetRegistry } from "@/shared/widgets/registry";
import { checkWidgetFile } from "../../scripts/validate-module";

const load = async () => ({ default: () => null });

describe("widget registry", () => {
  test("defineModuleWidgets: fills moduleId, validates ids, slots, permissions and loader", () => {
    const widgets = defineModuleWidgets("notifications", [{ id: "notifications.bell", slot: "header.right", size: "popover", titleKey: "notifications.widget.bell", requiredPermissions: ["notifications:view"], load }]);
    assert.equal(widgets[0].definition.moduleId, "notifications");
    assert.equal(Object.isFrozen(widgets), true);
    assert.throws(() => defineModuleWidgets("notifications", [{ id: "other.bell", slot: "header.right", size: "popover", titleKey: "x", load }]), /ownership/);
    assert.throws(() => defineModuleWidgets("notifications", [{ id: "notifications.bell", slot: "nowhere" as never, size: "popover", titleKey: "x", load }]), /slot/);
    assert.throws(() => defineModuleWidgets("notifications", [{ id: "notifications.bell", slot: "header.right", size: "popover", titleKey: "x", requiredPermissions: ["DROP TABLE"], load }]), /permission/);
    assert.throws(() => defineModuleWidgets("notifications", [{ id: "notifications.bell", slot: "header.right", size: "popover", titleKey: "x", load: undefined as never }]), /loader/);
    assert.throws(() => defineModuleWidgets("notifications", [
      { id: "notifications.bell", slot: "header.right", size: "popover", titleKey: "x", load },
      { id: "notifications.bell", slot: "header.right", size: "popover", titleKey: "x", load },
    ]), /Duplicate/);
  });

  test("validateWidgetRegistry / buildWidgetRegistry: cross-module duplicates and ownership", () => {
    const a = defineModuleWidgets("alpha-mod", [{ id: "alpha-mod.w", slot: "header.right", size: "compact", titleKey: "x", load }]);
    assert.deepEqual(validateWidgetRegistry([{ module: "alpha-mod", widgets: a }]), []);
    assert.equal(validateWidgetRegistry([{ module: "beta-mod", widgets: a }]).length, 1, "declared under wrong module");
    assert.equal(validateWidgetRegistry([{ module: "alpha-mod", widgets: a }, { module: "alpha-mod", widgets: a }]).some((e) => e.includes("Duplicate")), true);
    assert.throws(() => buildWidgetRegistry([{ module: "beta-mod", widgets: a }]), /invalid/);
    assert.equal(buildWidgetRegistry([{ module: "alpha-mod", widgets: a }]).length, 1);
  });

  test("visibility: usable module + every required permission; unknown permission denies", () => {
    const registry = [
      ...defineModuleWidgets("notifications", [{ id: "notifications.bell", slot: "header.right", size: "popover", titleKey: "x", requiredPermissions: ["notifications:view"], load }]),
      ...defineModuleWidgets("help-center", [{ id: "help-center.help", slot: "header.right", size: "popover", titleKey: "x", load }]),
      ...defineModuleWidgets("secret", [{ id: "secret.w", slot: "header.right", size: "compact", titleKey: "x", requiredPermissions: ["missing:view"], load }]),
    ];
    const resources = [{ moduleKey: "notifications", definitions: [definePermissions("notifications", { ADMIN: ["view"], BOARD: [], SECRETARY: [], TREASURER: [], AUDITOR: [], TEACHER: [], VIEWER: [] })] }];
    assert.deepEqual(visibleWidgetIds({ registry, usableModuleKeys: ["notifications", "secret"], role: "ADMIN", resources }), ["notifications.bell"]);
    assert.deepEqual(visibleWidgetIds({ registry, usableModuleKeys: ["notifications", "help-center"], role: "VIEWER", resources }), ["help-center.help"]);
    assert.deepEqual(visibleWidgetIds({ registry, usableModuleKeys: [], role: "ADMIN", resources }), [], "unlicensed/inactive module → no widget");
  });

  test("validator: widget.ts must be client-safe, own-module and local loaders only", () => {
    const ok = 'import { defineModuleWidgets } from "@/shared/widgets/registry";\nexport const widgets = defineModuleWidgets("notifications", [{ id: "notifications.bell", slot: "header.right", size: "popover", titleKey: "k", load: () => import("./widgets/bell") }]);';
    assert.deepEqual(checkWidgetFile("notifications", ok), []);
    assert.deepEqual(checkWidgetFile("notifications", null), [], "missing widget.ts is not an error");
    assert.equal(checkWidgetFile("notifications", `import "server-only";\n${ok}`).length, 1);
    assert.equal(checkWidgetFile("other", ok).length, 1);
    assert.equal(checkWidgetFile("notifications", ok.replace("./widgets/bell", "@/modules/mail/x")).length, 1);
    assert.equal(checkWidgetFile("notifications", "export const x = 1;").length, 1);
  });

  test("generator output: deterministic, client-safe, no runtime scanning", () => {
    const text = fs.readFileSync("src/widget-registry.ts", "utf8");
    assert.match(text, /buildWidgetRegistry\(/);
    assert.doesNotMatch(text, /server-only|readdirSync|require\(/);
  });
});
