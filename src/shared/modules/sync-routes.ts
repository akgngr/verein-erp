import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");
const DASHBOARD_DIR = path.join(ROOT_DIR, "src", "app", "(dashboard)");
const API_DIR = path.join(ROOT_DIR, "src", "app", "api");

export const AUTO_ROUTE_BANNER =
  "// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).";

/** Modül içi alt sayfa klasörü: src/modules/<module>/routes/<alt/yol>/page.tsx */
const MODULE_SUBPAGES_DIR = "routes";
/** Modül içi API klasörü: src/modules/<module>/api/<alt/yol>/route.ts */
const MODULE_API_DIR = "api";

export interface SyncRoutesResult {
  syncedRoutes: string[];
  cleanedRoutes: string[];
}

/**
 * Otomatik Modül Sayfa/Rota Senkronizasyonu (Module Route Synchronizer):
 * Her modülün içindeki src/modules/<module>/page.tsx dosyasını keşfeder
 * ve src/app/(dashboard)/<route>/page.tsx içerisine otomatik ince köprü (bridge)
 * rotasını yerleştirir.
 *
 * Ek olarak:
 * - src/modules/<module>/routes/<alt/yol>/page.tsx -> src/app/(dashboard)/<route>/<alt/yol>/page.tsx
 * - src/modules/<module>/api/<alt/yol>/route.ts    -> src/app/api/<module>/<alt/yol>/route.ts
 * - Kaynağı silinmiş otomatik köprüler (banner taşıyanlar) temizlenir.
 *
 * Böylece dış AI agent'lar ve geliştiriciler src/app katmanına DOKUNMADAN
 * yalnızca src/modules/<module>/ altında dosya yazarak Next.js sayfasını ayağa kaldırabilir.
 */
export function syncModuleRoutes(): SyncRoutesResult {
  const result: SyncRoutesResult = {
    syncedRoutes: [],
    cleanedRoutes: [],
  };

  if (!fs.existsSync(MODULES_DIR) || !fs.existsSync(DASHBOARD_DIR)) {
    return result;
  }

  const moduleEntries = fs.readdirSync(MODULES_DIR, { withFileTypes: true });
  const activeRoutePaths = new Set<string>();

  for (const entry of moduleEntries) {
    if (!entry.isDirectory()) continue;
    const moduleName = entry.name;
    const modulePagePath = path.join(MODULES_DIR, moduleName, "page.tsx");

    // API köprüleri sayfadan bağımsızdır.
    syncModuleApiRoutes(moduleName, result);

    if (!fs.existsSync(modulePagePath)) {
      continue;
    }

    // 1. Modülün hedef rotasını belirle (module.config.ts içindeki nav[0].href veya modül adı)
    let routeSegment = moduleName;
    const configPath = path.join(MODULES_DIR, moduleName, "module.config.ts");
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, "utf8");
        // nav içindeki ilk href: "/..." tanımını yakala
        const hrefMatch = configContent.match(/href:\s*["']\/([^"']+)["']/);
        if (hrefMatch && hrefMatch[1]) {
          // Örn: "ayarlar/kullanicilar" veya "muhasebe" veya "events"
          routeSegment = hrefMatch[1];
        }
      } catch (err) {
        console.error(`[sync-routes] Error reading module config for ${moduleName}:`, err);
      }
    }

    activeRoutePaths.add(routeSegment);

    const targetRouteDir = path.join(DASHBOARD_DIR, routeSegment);
    const targetPagePath = path.join(targetRouteDir, "page.tsx");

    // Rota dizinini oluştur
    if (!fs.existsSync(targetRouteDir)) {
      fs.mkdirSync(targetRouteDir, { recursive: true });
    }

    const bridgeCode = `${AUTO_ROUTE_BANNER}
// Kaynak: src/modules/${moduleName}/page.tsx
export { default, metadata } from "@/modules/${moduleName}/page";
`;

    // Dosya yoksa veya otomatik üretilmişse güncelle
    let needsWrite = true;
    if (fs.existsSync(targetPagePath)) {
      const existingContent = fs.readFileSync(targetPagePath, "utf8");
      if (existingContent === bridgeCode) {
        needsWrite = false;
      } else if (!existingContent.includes(AUTO_ROUTE_BANNER)) {
        // Eğer kullanıcı manuel özel bir sayfa yazmışsa üzerine yazma, koru
        needsWrite = false;
      }
    }

    if (needsWrite) {
      try {
        fs.writeFileSync(targetPagePath, bridgeCode, "utf8");
        result.syncedRoutes.push(`${moduleName} -> /${routeSegment}`);
      } catch (err) {
        console.error(`[sync-routes] Failed to write route bridge for ${moduleName}:`, err);
      }
    } else {
      result.syncedRoutes.push(`${moduleName} -> /${routeSegment} (güncel)`);
    }

    // 2. Alt sayfalar (routes/<alt/yol>/page.tsx)
    syncModuleSubpages(moduleName, routeSegment, result);
  }

  // 3. Kaynağı silinmiş otomatik köprüleri temizle
  cleanStaleBridges(DASHBOARD_DIR, result);
  cleanStaleBridges(API_DIR, result);

  return result;
}

/** Bir dizindeki, adı `fileName` olan dosyaların göreli klasör yollarını döndürür. */
function findFiles(baseDir: string, fileName: string, relDir = ""): string[] {
  const currentDir = path.join(baseDir, relDir);
  if (!fs.existsSync(currentDir)) return [];
  let found: string[] = [];
  for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
    const relPath = relDir ? `${relDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      found = found.concat(findFiles(baseDir, fileName, relPath));
    } else if (entry.name === fileName && relDir) {
      found.push(relDir);
    }
  }
  return found;
}

/** Köprüyü yalnızca dosya yoksa veya otomatik üretilmişse yazar (manuel dosyalar korunur). */
function writeBridge(
  targetPath: string,
  bridgeCode: string,
  label: string,
  result: SyncRoutesResult,
): void {
  if (fs.existsSync(targetPath)) {
    const existingContent = fs.readFileSync(targetPath, "utf8");
    if (existingContent === bridgeCode) {
      result.syncedRoutes.push(`${label} (güncel)`);
      return;
    }
    if (!existingContent.includes(AUTO_ROUTE_BANNER)) {
      console.warn(`[sync-routes] Manuel dosya korunuyor, köprü yazılmadı: ${targetPath}`);
      return;
    }
  }

  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, bridgeCode, "utf8");
    result.syncedRoutes.push(label);
  } catch (err) {
    console.error(`[sync-routes] Failed to write bridge ${targetPath}:`, err);
  }
}

function syncModuleSubpages(
  moduleName: string,
  routeSegment: string,
  result: SyncRoutesResult,
): void {
  const subpagesDir = path.join(MODULES_DIR, moduleName, MODULE_SUBPAGES_DIR);
  for (const subPath of findFiles(subpagesDir, "page.tsx")) {
    const source = `src/modules/${moduleName}/${MODULE_SUBPAGES_DIR}/${subPath}/page.tsx`;
    const importPath = `@/modules/${moduleName}/${MODULE_SUBPAGES_DIR}/${subPath}/page`;
    const bridgeCode = `${AUTO_ROUTE_BANNER}
// Kaynak: ${source}
export { default } from "${importPath}";
export * from "${importPath}";
`;
    writeBridge(
      path.join(DASHBOARD_DIR, routeSegment, subPath, "page.tsx"),
      bridgeCode,
      `${moduleName} -> /${routeSegment}/${subPath}`,
      result,
    );
  }
}

function syncModuleApiRoutes(moduleName: string, result: SyncRoutesResult): void {
  const apiDir = path.join(MODULES_DIR, moduleName, MODULE_API_DIR);
  for (const subPath of findFiles(apiDir, "route.ts")) {
    const source = `src/modules/${moduleName}/${MODULE_API_DIR}/${subPath}/route.ts`;
    const bridgeCode = `${AUTO_ROUTE_BANNER}
// Kaynak: ${source}
export * from "@/modules/${moduleName}/${MODULE_API_DIR}/${subPath}/route";
`;
    writeBridge(
      path.join(API_DIR, moduleName, subPath, "route.ts"),
      bridgeCode,
      `${moduleName} -> /api/${moduleName}/${subPath}`,
      result,
    );
  }
}

/**
 * Banner taşıyan ve "// Kaynak:" satırındaki dosyası artık bulunmayan köprüleri siler,
 * bu silmeyle boşalan klasörleri kaldırır. Manuel yazılmış (banner'sız) dosyalara dokunmaz.
 */
function cleanStaleBridges(baseDir: string, result: SyncRoutesResult): void {
  if (!fs.existsSync(baseDir)) return;

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (entry.name !== "page.tsx" && entry.name !== "route.ts") continue;

      const content = fs.readFileSync(fullPath, "utf8");
      if (!content.startsWith(AUTO_ROUTE_BANNER)) continue;

      const sourceMatch = content.match(/^\/\/ Kaynak: (\S+)$/m);
      if (!sourceMatch || fs.existsSync(path.join(ROOT_DIR, sourceMatch[1]))) continue;

      try {
        fs.unlinkSync(fullPath);
        result.cleanedRoutes.push(path.relative(ROOT_DIR, fullPath));
        // Yalnızca bu silme ile boşalan klasörleri kaldır
        let parent = path.dirname(fullPath);
        while (
          parent.startsWith(baseDir) &&
          parent !== baseDir &&
          fs.readdirSync(parent).length === 0
        ) {
          fs.rmdirSync(parent);
          parent = path.dirname(parent);
        }
      } catch (err) {
        console.error(`[sync-routes] Failed to remove stale bridge ${fullPath}:`, err);
      }
    }
  };

  walk(baseDir);
}
