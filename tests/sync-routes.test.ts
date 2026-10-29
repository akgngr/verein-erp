import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  AUTO_ROUTE_BANNER,
  resolveRouteSegment,
  segmentConfig,
  syncModuleRoutes,
} from "../src/shared/modules/sync-routes";

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
        content.includes('export { default } from "@/modules/temp-dummy-mod/page";') &&
          content.includes('export * from "@/modules/temp-dummy-mod/page";'),
        "varsayılan bileşen ve tüm dışa aktarımlar (metadata, generateMetadata) köprülenmelidir",
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

  test("route kökü: basePath > ilk nav href'i (sorgu hariç)", () => {
    assert.equal(resolveRouteSegment('basePath: "/profil",\n  nav: [],'), "profil");
    assert.equal(resolveRouteSegment('nav: [{ href: "/ayarlar/kullanicilar" }]'), "ayarlar/kullanicilar");
    assert.equal(
      resolveRouteSegment('basePath: "/x",\n nav: [{ href: "/y" }]'),
      "x",
      "basePath nav'dan önceliklidir",
    );
    assert.equal(resolveRouteSegment("nav: []"), undefined);
  });

  test("segment config (runtime, maxDuration…) kaynaktan köprüye kopyalanır", () => {
    const dir = path.join(process.cwd(), "src", "modules", "temp-segment-mod");
    const file = path.join(dir, "route.ts");
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        file,
        'export const runtime = "nodejs";\nexport const maxDuration = 60\nconst runtimeHelper = 1;\nexport async function GET() {}\n',
      );
      assert.equal(
        segmentConfig("src/modules/temp-segment-mod/route.ts"),
        'export const runtime = "nodejs";\nexport const maxDuration = 60;\n',
      );
      assert.equal(segmentConfig("src/modules/temp-segment-mod/yok.ts"), "");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
