import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { syncModuleRoutes, AUTO_ROUTE_BANNER } from "../src/shared/modules/sync-routes";

describe("Module Route Synchronizer", () => {
  test("syncModuleRoutes connects module pages to dashboard routes", () => {
    const dummyModuleDir = path.join(process.cwd(), "src", "modules", "temp-dummy-mod");
    const dummyPage = path.join(dummyModuleDir, "page.tsx");
    const dashboardDir = path.join(process.cwd(), "src", "app", "(dashboard)");
    const expectedBridge = path.join(dashboardDir, "temp-dummy-mod", "page.tsx");

    try {
      fs.mkdirSync(dummyModuleDir, { recursive: true });
      fs.writeFileSync(dummyPage, "export default function DummyPage() { return null; }", "utf8");

      const result = syncModuleRoutes();
      assert.strictEqual(Array.isArray(result.syncedRoutes), true);

      assert.ok(fs.existsSync(expectedBridge), "Köprü rotası oluşturulmuş olmalıdır");
      const content = fs.readFileSync(expectedBridge, "utf8");
      assert.ok(content.includes(AUTO_ROUTE_BANNER), "Banner içermelidir");
      assert.ok(
        content.includes('export { default, metadata } from "@/modules/temp-dummy-mod/page";'),
        "page export edilmelidir"
      );
    } finally {
      if (fs.existsSync(expectedBridge)) {
        fs.unlinkSync(expectedBridge);
      }
      const bridgeDir = path.dirname(expectedBridge);
      if (fs.existsSync(bridgeDir)) {
        fs.rmdirSync(bridgeDir);
      }
      if (fs.existsSync(dummyPage)) {
        fs.unlinkSync(dummyPage);
      }
      if (fs.existsSync(dummyModuleDir)) {
        fs.rmdirSync(dummyModuleDir);
      }
    }
  });

  test("syncModuleRoutes preserves custom user pages without overwriting", () => {
    const testRouteDir = path.join(process.cwd(), "src", "app", "(dashboard)", "temp-test-route");
    const testPage = path.join(testRouteDir, "page.tsx");
    const customContent = "// Özel kullanıcı sayfası - üzerine yazılmamalıdır\nexport default function CustomPage() { return null; }";

    try {
      fs.mkdirSync(testRouteDir, { recursive: true });
      fs.writeFileSync(testPage, customContent, "utf8");

      // syncModuleRoutes çalıştırıldığında özel sayfa korunmalı
      syncModuleRoutes();

      const currentContent = fs.readFileSync(testPage, "utf8");
      assert.strictEqual(currentContent, customContent, "Özel kullanıcı sayfası korunmalıdır");
    } finally {
      if (fs.existsSync(testPage)) {
        fs.unlinkSync(testPage);
      }
      if (fs.existsSync(testRouteDir)) {
        fs.rmdirSync(testRouteDir);
      }
    }
  });
});
