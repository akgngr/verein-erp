import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  AUTO_ROUTE_BANNER,
  resolveRouteSegment,
  segmentConfig,
  syncModuleRoutes,
} from "@/shared/modules/sync-routes";

describe("Module Route Synchronizer", () => {
  test("syncModuleRoutes connects module pages to dashboard routes (isolated sandbox)", () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "verein-sync-routes-"));
    const dummyModuleDir = path.join(sandbox, "src", "modules", "temp-dummy-mod");
    const dummyPage = path.join(dummyModuleDir, "page.tsx");
    const generatedPagesDir = path.join(sandbox, "src", "app", "(dashboard)", "(modules)");
    const expectedBridge = path.join(generatedPagesDir, "temp-dummy-mod", "page.tsx");

    try {
      fs.mkdirSync(dummyModuleDir, { recursive: true });
      fs.writeFileSync(dummyPage, "export default function DummyPage() { return null; }", "utf8");

      const result = syncModuleRoutes({ rootDir: sandbox });
      assert.strictEqual(Array.isArray(result.syncedRoutes), true);

      assert.ok(fs.existsSync(expectedBridge), "Köprü rotası oluşturulmuş olmalıdır");
      const content = fs.readFileSync(expectedBridge, "utf8");
      assert.ok(content.includes(AUTO_ROUTE_BANNER), "Banner içermelidir");
      assert.ok(
        content.includes('import Page from "@/modules/temp-dummy-mod/page";') &&
          content.includes('export default withModuleGate("temp-dummy-mod", Page);') &&
          content.includes('export * from "@/modules/temp-dummy-mod/page";'),
        "çekirdek olmayan modülün sayfası erişim kapısıyla sarılmalı; tüm dışa aktarımlar (generateMetadata) köprülenmelidir",
      );

      // Kaynak silindi: yeniden senkronda klasör temiz kurulur, köprü kalmaz.
      fs.unlinkSync(dummyPage);
      fs.rmdirSync(dummyModuleDir);
      syncModuleRoutes({ rootDir: sandbox });
      assert.ok(!fs.existsSync(expectedBridge), "kaynağı silinen köprü temiz kurulumda kalkmalıdır");
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });

  test("syncModuleRoutes preserves custom user pages without overwriting (isolated sandbox)", () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "verein-sync-custom-"));
    const testRouteDir = path.join(sandbox, "src", "app", "(dashboard)", "temp-test-route");
    const testPage = path.join(testRouteDir, "page.tsx");
    const customContent = "// Özel kullanıcı sayfası - üzerine yazılmamalıdır\nexport default function CustomPage() { return null; }";

    try {
      fs.mkdirSync(testRouteDir, { recursive: true });
      fs.writeFileSync(testPage, customContent, "utf8");

      // syncModuleRoutes çalıştırıldığında özel sayfa korunmalı
      syncModuleRoutes({ rootDir: sandbox });

      const currentContent = fs.readFileSync(testPage, "utf8");
      assert.strictEqual(currentContent, customContent, "Özel kullanıcı sayfası korunmalıdır");
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
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

  test("segment config (runtime, maxDuration…) kaynaktan köprüye kopyalanır (isolated sandbox)", () => {
    const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "verein-segment-mod-"));
    const dir = path.join(sandbox, "src", "modules", "temp-segment-mod");
    const file = path.join(dir, "route.ts");
    try {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        file,
        'export const runtime = "nodejs";\nexport const maxDuration = 60\nconst runtimeHelper = 1;\nexport async function GET() {}\n',
      );
      assert.equal(
        segmentConfig("src/modules/temp-segment-mod/route.ts", sandbox),
        'export const runtime = "nodejs";\nexport const maxDuration = 60;\n',
      );
      assert.equal(segmentConfig("src/modules/temp-segment-mod/yok.ts", sandbox), "");
    } finally {
      fs.rmSync(sandbox, { recursive: true, force: true });
    }
  });
});
