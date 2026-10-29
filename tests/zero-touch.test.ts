import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { AUTO_ROUTE_BANNER } from "../src/shared/modules/sync-routes";

const ROOT_DIR = process.cwd();
const APP_DIR = path.join(ROOT_DIR, "src", "app");

/**
 * Sıfır dokunuş kuralı: modül eklemek/değiştirmek için src/app'e elle dosya yazılmaz.
 * src/app'teki sayfa ve API dosyaları ya `module:sync`'in ürettiği köprülerdir ya da bu
 * listedeki kabuk dosyalarıdır (modüle ait olmayan, uygulamanın iskeleti).
 */
const SHELL_ROUTE_FILES = new Set([
  "(dashboard)/page.tsx", // Panel: birden çok modülün özetini gösterir
  "(auth)/giris/page.tsx", // Giriş: oturum öncesi düzen (dashboard dışında)
  "api/health/route.ts", // Konteyner sağlık kontrolü
]);

function listRouteFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listRouteFiles(fullPath));
    else if (entry.name === "page.tsx" || entry.name === "route.ts") files.push(fullPath);
  }
  return files;
}

describe("Sıfır dokunuş (zero-touch) kuralı", () => {
  const files = listRouteFiles(APP_DIR);

  test("src/app'te kabuk dışında elle yazılmış sayfa/API dosyası yoktur", () => {
    const manual = files
      .filter((file) => !fs.readFileSync(file, "utf8").startsWith(AUTO_ROUTE_BANNER))
      .map((file) => path.relative(APP_DIR, file).split(path.sep).join("/"))
      .filter((file) => !SHELL_ROUTE_FILES.has(file));
    assert.deepEqual(
      manual,
      [],
      "Bu dosyaları modüle taşıyın (src/modules/<m>/page.tsx, routes/<yol>/page.tsx veya api/<yol>/route.ts) " +
        `ve 'pnpm module:sync' çalıştırın:\n${manual.join("\n")}`,
    );
  });

  test("her köprünün kaynağı modülde vardır", () => {
    const orphans = files.filter((file) => {
      const content = fs.readFileSync(file, "utf8");
      if (!content.startsWith(AUTO_ROUTE_BANNER)) return false;
      const source = content.match(/^\/\/ Kaynak: (\S+)$/m)?.[1];
      return !source || !source.startsWith("src/modules/") || !fs.existsSync(path.join(ROOT_DIR, source));
    });
    assert.deepEqual(orphans, [], "Kaynağı olmayan köprü: 'pnpm module:sync' çalıştırın");
  });

  test("kabuk listesi güncel (listedeki her dosya vardır)", () => {
    for (const file of SHELL_ROUTE_FILES) {
      assert.ok(fs.existsSync(path.join(APP_DIR, file)), `${file} artık yok; SHELL_ROUTE_FILES'tan çıkarın`);
    }
  });
});
