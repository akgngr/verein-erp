import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { syncModuleRoutes, AUTO_ROUTE_BANNER } from "../src/shared/modules/sync-routes";

describe("Module Route Synchronizer", () => {
  test("syncModuleRoutes connects module pages to dashboard routes", () => {
    const result = syncModuleRoutes();
    assert.strictEqual(Array.isArray(result.syncedRoutes), true);
    assert.ok(result.syncedRoutes.length > 0, "En az bir modül rotası senkronize edilmelidir");

    const dashboardDir = path.join(process.cwd(), "src", "app", "(dashboard)");

    // events modülü için rota köprüsü doğrulaması
    const eventsBridge = path.join(dashboardDir, "events", "page.tsx");
    assert.ok(fs.existsSync(eventsBridge), "events köprü rotası oluşturulmuş olmalıdır");
    const eventsContent = fs.readFileSync(eventsBridge, "utf8");
    assert.ok(eventsContent.includes(AUTO_ROUTE_BANNER), "Banner içermelidir");
    assert.ok(
      eventsContent.includes('export { default, metadata } from "@/modules/events/page";'),
      "events/page export edilmelidir"
    );
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
