import fs from "node:fs";
import path from "node:path";

import semver from "semver";

/**
 * Modül npm bağımlılıkları (betikler ve doğrulayıcı için; Node'da çalışır).
 *
 * Kural: modül kodundaki her dış paket (örn. `import QRCode from "qrcode"`) ya çekirdekte
 * (kök package.json'da ve hiçbir modüle ait değil) ya da modülün `dependencies` alanında
 * bildirilmiş olmalıdır. `pnpm module:deps` bildirilen paketleri kök package.json'a ekler ve
 * sahiplerini `moduleDependencies` alanına yazar (kaldırılan modülün paketi temizlenebilsin diye).
 */
export type ModuleDependencyMap = Record<string, string>;

const ROOT = process.cwd();
const MODULES_DIR = path.join(ROOT, "src", "modules");

/** "qrcode/lib/x" → "qrcode", "@scope/pkg/sub" → "@scope/pkg". Dahili ve göreli yollar null. */
export function packageNameOf(specifier: string): string | null {
  if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("@/") || specifier.startsWith("node:")) return null;
  const parts = specifier.split("/");
  if (specifier.startsWith("@")) return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  return parts[0] || null;
}

const IMPORT_PATTERN = /(?:import|export)\s[^"']*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/g;
const NODE_BUILTINS = new Set(["fs", "path", "crypto", "stream", "url", "util", "os", "zlib", "buffer", "events", "http", "https", "child_process"]);

/** Kaynak metindeki dış paket adları (tip içe aktarımları dahil). */
export function externalPackagesIn(source: string): string[] {
  const found = new Set<string>();
  // Yorumlardaki örnek kodlar sayılmaz.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  for (const match of code.matchAll(IMPORT_PATTERN)) {
    const name = packageNameOf(match[1] ?? match[2] ?? match[3] ?? match[4] ?? "");
    if (name && !NODE_BUILTINS.has(name)) found.add(name);
  }
  return [...found];
}

export function modulePackageUsage(moduleDir: string): Map<string, string[]> {
  const usage = new Map<string, string[]>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (/\.(ts|tsx|mts|js|mjs)$/.test(entry.name)) {
        for (const name of externalPackagesIn(fs.readFileSync(fullPath, "utf8"))) usage.set(name, [...(usage.get(name) ?? []), path.relative(moduleDir, fullPath)]);
      }
    }
  };
  walk(moduleDir);
  return usage;
}

/**
 * Çekirdek paketler: modüller DIŞINDAKİ kodun (src/app, src/shared, kök yapılandırma) kullandığı
 * paketler. Modül bunları bildirebilir ama sahiplenemez; modül kaldırılınca silinmezler.
 */
export function corePackages(): Set<string> {
  const found = new Set<string>(["next", "react", "react-dom", "typescript"]);
  const scan = (target: string) => {
    if (!fs.existsSync(target)) return;
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      if (/\.(ts|tsx|mts|mjs|js|cjs)$/.test(target)) for (const name of externalPackagesIn(fs.readFileSync(target, "utf8"))) found.add(name);
      return;
    }
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      const full = path.join(target, entry.name);
      if (full === MODULES_DIR || entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      scan(full);
    }
  };
  scan(path.join(ROOT, "src"));
  for (const file of fs.readdirSync(ROOT)) if (/\.(ts|mts|mjs|js|cjs)$/.test(file)) scan(path.join(ROOT, file));
  scan(path.join(ROOT, "scripts"));
  scan(path.join(ROOT, "prisma"));
  return found;
}

/** module.config.ts içindeki `dependencies: { ... }` (statik metin olarak okunur; çalıştırılmaz). */
export function declaredDependencies(configSource: string): ModuleDependencyMap {
  const block = configSource.match(/\bdependencies:\s*\{([\s\S]*?)\}/);
  if (!block) return {};
  const result: ModuleDependencyMap = {};
  for (const match of block[1].matchAll(/["']?(@?[\w.-]+(?:\/[\w.-]+)?)["']?\s*:\s*["']([^"']+)["']/g)) result[match[1]] = match[2];
  return result;
}

export type RootPackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  /** paket → onu bildiren modüller (pnpm module:deps yazar). */
  moduleDependencies?: Record<string, string[]>;
};

export function readRootPackage(): RootPackageJson {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")) as RootPackageJson;
}

export function listModuleDeclarations(): Map<string, ModuleDependencyMap> {
  const result = new Map<string, ModuleDependencyMap>();
  for (const entry of fs.readdirSync(MODULES_DIR, { withFileTypes: true })) {
    const configPath = path.join(MODULES_DIR, entry.name, "module.config.ts");
    if (entry.isDirectory() && fs.existsSync(configPath)) result.set(entry.name, declaredDependencies(fs.readFileSync(configPath, "utf8")));
  }
  return result;
}

/** İki aralık aynı sürümle karşılanabilir mi (en küçük sürüm diğerini sağlıyor mu)? */
export function rangesCompatible(a: string, b: string): boolean {
  if (a === b) return true;
  const minA = semver.minVersion(a);
  const minB = semver.minVersion(b);
  if (!minA || !minB) return false;
  return semver.satisfies(minA, b) || semver.satisfies(minB, a);
}

/** Doğrulayıcı: bir modülün paket kullanımı ve bildirimi tutarlı mı? */
export function checkModuleDependencies(moduleDir: string, moduleKey: string, configSource: string, root: RootPackageJson = readRootPackage()): string[] {
  const problems: string[] = [];
  const installed = { ...(root.dependencies ?? {}), ...(root.devDependencies ?? {}) };
  const owned = root.moduleDependencies ?? {};
  const declared = declaredDependencies(configSource);
  const core = corePackages();
  for (const [name, files] of modulePackageUsage(moduleDir)) {
    if (declared[name]) continue;
    const ownedByOthers = (owned[name] ?? []).filter((owner) => owner !== moduleKey);
    if (!installed[name] || !core.has(name)) {
      if (!ownedByOthers.length) problems.push(`'${name}' paketi kullanılıyor (${files[0]}) ama bildirilmemiş: module.config.ts → dependencies: { "${name}": "^x.y.z" } ekleyip 'pnpm module:deps' çalıştırın.`);
    }
    else if (ownedByOthers.length) problems.push(`'${name}' paketi ${ownedByOthers.join(", ")} modülüne ait; bu modül de kullanıyorsa kendi dependencies alanında bildirmeli.`);
  }
  for (const [name, range] of Object.entries(declared)) {
    if (!semver.validRange(range)) problems.push(`dependencies: '${name}' için geçersiz sürüm aralığı '${range}'.`);
    else if (!installed[name]) problems.push(`dependencies: '${name}@${range}' kurulu değil; 'pnpm module:deps' çalıştırıp package.json ve pnpm-lock.yaml'ı commit'leyin.`);
    else if (!rangesCompatible(installed[name], range)) problems.push(`dependencies: '${name}@${range}' kurulu sürümle (${installed[name]}) uyumsuz; çekirdek paketlerin sürümü modülden değiştirilemez.`);
    else if (!core.has(name) && !(owned[name] ?? []).includes(moduleKey)) problems.push(`dependencies: '${name}' sahiplik kaydı eksik; 'pnpm module:deps' çalıştırın.`);
  }
  return problems;
}
