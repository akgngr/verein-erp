import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");
const DASHBOARD_DIR = path.join(ROOT_DIR, "src", "app", "(dashboard)");

export const AUTO_ROUTE_BANNER = "// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).";

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
 * Böylece dış AI agent'lar ve geliştiriciler src/app katmanına DOKUNMADAN
 * yalnızca src/modules/<module>/page.tsx yazarak Next.js sayfasını ayağa kaldırabilir.
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
  }

  return result;
}
