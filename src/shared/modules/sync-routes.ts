import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");
const APP_DIR = path.join(ROOT_DIR, "src", "app");
/**
 * Üretilen köprülerin TEK yeri (rota grupları URL'ye eklenmez):
 * - sayfalar: src/app/(dashboard)/(modules)/<rota>/…/page.tsx → /<rota>/…
 * - API:      src/app/api/(modules)/<modül>/…/route.ts        → /api/<modül>/…
 * Bu klasörler her senkronda baştan kurulur; elle dosya konmaz.
 */
export const GENERATED_PAGES_DIR = path.join(APP_DIR, "(dashboard)", "(modules)");
export const GENERATED_API_DIR = path.join(APP_DIR, "api", "(modules)");

export const AUTO_ROUTE_BANNER =
  "// Otomatik senkronize edilmiştir (scripts/sync-schemas.ts & syncModuleRoutes).";

/** Modül içi alt sayfa klasörü: src/modules/<module>/routes/<alt/yol>/page.tsx */
const MODULE_SUBPAGES_DIR = "routes";
/** Modül içi API klasörü: src/modules/<module>/api/<alt/yol>/route.ts */
const MODULE_API_DIR = "api";

export interface SyncRoutesResult {
  syncedRoutes: string[];
  /** Klasör yeniden kurulduysa true (içerik aynıysa dokunulmaz; dev sunucu boşuna yeniden derlemez). */
  rebuilt: boolean;
  /** Eski düzenden (köprülerin doğrudan (dashboard)/ ve api/ altında olduğu) taşınıp silinen dosyalar. */
  cleanedRoutes: string[];
}

/**
 * Modül Rota Senkronizasyonu: tüm modüllerin sayfa ve API köprülerini üretilen klasörlerde
 * toplar. KARAR: klasörler "temiz kurulum" ile oluşturulur — tüm köprüler önce geçici bir
 * klasöre yazılır, içerik mevcut klasörden farklıysa eski klasör silinip yenisi yerine konur.
 * Böylece silinen/yeniden adlandırılan modüllerden artık köprü kalmaz.
 *
 * - src/modules/<m>/page.tsx                 → (dashboard)/(modules)/<rota>/page.tsx
 * - src/modules/<m>/routes/<yol>/page.tsx    → (dashboard)/(modules)/<rota>/<yol>/page.tsx
 * - src/modules/<m>/api/<yol>/route.ts       → api/(modules)/<m>/<yol>/route.ts
 *
 * <rota>: module.config.ts'teki basePath, yoksa ilk nav href'i, yoksa modül anahtarı.
 */
export function syncModuleRoutes(): SyncRoutesResult {
  const result: SyncRoutesResult = { syncedRoutes: [], rebuilt: false, cleanedRoutes: [] };
  if (!fs.existsSync(MODULES_DIR)) return result;

  const pages = new Map<string, string>(); // GENERATED_PAGES_DIR'e göre yol → içerik
  const apis = new Map<string, string>(); // GENERATED_API_DIR'e göre yol → içerik

  for (const entry of fs.readdirSync(MODULES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const moduleName = entry.name;
    const moduleDir = path.join(MODULES_DIR, moduleName);

    for (const subPath of findFiles(path.join(moduleDir, MODULE_API_DIR), "route.ts")) {
      const source = `src/modules/${moduleName}/${MODULE_API_DIR}/${subPath}/route.ts`;
      apis.set(
        path.join(moduleName, subPath, "route.ts"),
        `${AUTO_ROUTE_BANNER}
// Kaynak: ${source}
export * from "@/modules/${moduleName}/${MODULE_API_DIR}/${subPath}/route";
${segmentConfig(source)}`,
      );
      result.syncedRoutes.push(`${moduleName} -> /api/${moduleName}/${subPath}`);
    }

    if (!fs.existsSync(path.join(moduleDir, "page.tsx"))) continue;
    const configPath = path.join(moduleDir, "module.config.ts");
    const routeSegment = (fs.existsSync(configPath) && resolveRouteSegment(fs.readFileSync(configPath, "utf8"))) || moduleName;

    pages.set(path.join(routeSegment, "page.tsx"), pageBridge(`src/modules/${moduleName}/page.tsx`, `@/modules/${moduleName}/page`));
    result.syncedRoutes.push(`${moduleName} -> /${routeSegment}`);

    for (const subPath of findFiles(path.join(moduleDir, MODULE_SUBPAGES_DIR), "page.tsx")) {
      pages.set(
        path.join(routeSegment, subPath, "page.tsx"),
        pageBridge(
          `src/modules/${moduleName}/${MODULE_SUBPAGES_DIR}/${subPath}/page.tsx`,
          `@/modules/${moduleName}/${MODULE_SUBPAGES_DIR}/${subPath}/page`,
        ),
      );
      result.syncedRoutes.push(`${moduleName} -> /${routeSegment}/${subPath}`);
    }
  }

  removeLegacyBridges(result);
  const pagesRebuilt = rebuildDir(GENERATED_PAGES_DIR, pages);
  const apisRebuilt = rebuildDir(GENERATED_API_DIR, apis);
  result.rebuilt = pagesRebuilt || apisRebuilt;
  return result;
}

/**
 * Modülün sayfalarının bağlandığı rota kökü: module.config.ts'teki `basePath`, yoksa ilk nav
 * `href`'i (örn. "ayarlar/kullanicilar", "muhasebe"). Ayrıştırma metin üzerindendir; config
 * import edilmez (sync betiği uygulama bağımlılıklarını yüklemez).
 */
export function resolveRouteSegment(configContent: string): string | undefined {
  const basePath = configContent.match(/basePath:\s*["']\/([^"']+)["']/);
  if (basePath) return basePath[1];
  const navHref = configContent.match(/href:\s*["']\/([^"'?]+)["']/);
  return navHref?.[1];
}

/**
 * KARAR: Route segment config (runtime, maxDuration, dynamic…) Next.js tarafından dosyanın
 * KENDİSİNDE statik olarak okunur; `export *` ile gelen değer dikkate alınmaz. Bu yüzden
 * kaynaktaki `export const <seçenek> = <değer>;` satırları köprüye kopyalanır.
 */
const SEGMENT_CONFIG_KEYS = [
  "dynamic",
  "dynamicParams",
  "revalidate",
  "fetchCache",
  "runtime",
  "preferredRegion",
  "maxDuration",
];

export function segmentConfig(sourceRelPath: string): string {
  const sourcePath = path.join(ROOT_DIR, sourceRelPath);
  if (!fs.existsSync(sourcePath)) return "";
  const pattern = new RegExp(`^export const (${SEGMENT_CONFIG_KEYS.join("|")})\\s*=\\s*[^;\\n]+;?$`, "gm");
  const lines = fs.readFileSync(sourcePath, "utf8").match(pattern) ?? [];
  return lines.map((line) => (line.endsWith(";") ? line : `${line};`)).join("\n") + (lines.length ? "\n" : "");
}

/** Sayfa köprüsü: varsayılan bileşen + tüm dışa aktarımlar (metadata, generateMetadata…) + segment config. */
function pageBridge(source: string, importPath: string): string {
  return `${AUTO_ROUTE_BANNER}
// Kaynak: ${source}
export { default } from "${importPath}";
export * from "${importPath}";
${segmentConfig(source)}`;
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

/** Klasördeki tüm dosyaları göreli yol → içerik olarak okur. */
function readTree(dir: string, relDir = ""): Map<string, string> {
  const files = new Map<string, string>();
  const current = path.join(dir, relDir);
  if (!fs.existsSync(current)) return files;
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const relPath = path.join(relDir, entry.name);
    if (entry.isDirectory()) for (const [key, value] of readTree(dir, relPath)) files.set(key, value);
    else files.set(relPath, fs.readFileSync(path.join(dir, relPath), "utf8"));
  }
  return files;
}

function sameTree(a: Map<string, string>, b: Map<string, string>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) if (b.get(key) !== value) return false;
  return true;
}

/**
 * Temiz kurulum: içerik farklıysa yeni ağacı geçici klasöre yazar, eski klasörü siler ve geçici
 * klasörü yerine taşır (yarım kalmış bir klasör hiçbir an görünmez). Aynıysa dokunmaz.
 */
function rebuildDir(targetDir: string, files: Map<string, string>): boolean {
  if (sameTree(readTree(targetDir), files)) return false;
  const tempDir = `${targetDir}.tmp-${process.pid}`;
  fs.rmSync(tempDir, { recursive: true, force: true });
  for (const [relPath, content] of files) {
    fs.mkdirSync(path.dirname(path.join(tempDir, relPath)), { recursive: true });
    fs.writeFileSync(path.join(tempDir, relPath), content, "utf8");
  }
  fs.rmSync(targetDir, { recursive: true, force: true });
  if (files.size > 0) {
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    fs.renameSync(tempDir, targetDir);
  } else {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  return true;
}

/**
 * Eski düzenden kalan köprüleri siler: üretilen klasörlerin DIŞINDA, banner taşıyan page/route
 * dosyaları (aynı URL'yi iki kez tanımlayıp derlemeyi kırarlar). Elle yazılmış dosyalara dokunmaz;
 * boşalan klasörleri kaldırır.
 */
function removeLegacyBridges(result: SyncRoutesResult): void {
  const generated = [GENERATED_PAGES_DIR, GENERATED_API_DIR];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir) || generated.some((root) => dir === root || dir.startsWith(`${root}.tmp-`))) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        if (fs.existsSync(fullPath) && fs.readdirSync(fullPath).length === 0) fs.rmdirSync(fullPath);
        continue;
      }
      if (entry.name !== "page.tsx" && entry.name !== "route.ts") continue;
      if (!fs.readFileSync(fullPath, "utf8").startsWith(AUTO_ROUTE_BANNER)) continue;
      fs.unlinkSync(fullPath);
      result.cleanedRoutes.push(path.relative(ROOT_DIR, fullPath));
    }
  };
  walk(APP_DIR);
}
