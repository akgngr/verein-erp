import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");
const REGISTRY_FILE = path.join(ROOT_DIR, "src", "registry.ts");
const CARDS_FILE = path.join(ROOT_DIR, "src", "dashboard-cards.ts");
const AI_FILE = path.join(ROOT_DIR, "src", "ai-registry.ts");
const DEMO_FILE = path.join(ROOT_DIR, "src", "demo-registry.ts");
const LIFECYCLE_FILE = path.join(ROOT_DIR, "src", "lifecycle-registry.ts");
const PERMISSIONS_FILE = path.join(ROOT_DIR, "src", "permissions-registry.ts");

// Sabit öncelikli sıralama (çekirdek ve resmi modüller üstte)
const PRIORITY_ORDER = [
  "documents",
  "meetings",
  "members",
  "accounting",
  "donations",
  "organization",
  "users",
  "system",
  "audit",
  "auth",
];

/**
 * Modül Kayıt Defteri Senkronizasyonu (Module Registry Synchronizer):
 * src/modules/ altındaki tüm geçerli modülleri otomatik keşfeder ve
 * src/registry.ts dosyasını günceller. Dışarıdan yeni bir modül eklendiğinde
 * core kodda elle düzenleme yapma ihtiyacını ortadan kaldırır.
 */
export function syncModuleRegistry(): { registered: string[] } {
  if (!fs.existsSync(MODULES_DIR)) {
    return { registered: [] };
  }

  const entries = fs.readdirSync(MODULES_DIR, { withFileTypes: true });
  const validModules: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const moduleName = entry.name;
    const configPath = path.join(MODULES_DIR, moduleName, "module.config.ts");
    if (fs.existsSync(configPath)) {
      validModules.push(moduleName);
    }
  }

  // Öncelik sırasına göre sırala (bilinenler önce, eklentiler alfabetik sonra)
  validModules.sort((a, b) => {
    const idxA = PRIORITY_ORDER.indexOf(a);
    const idxB = PRIORITY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const imports = validModules
    .map((mod) => `import { moduleConfig as ${mod}Module } from "@/modules/${mod}";`)
    .join("\n");

  const listItems = validModules.map((mod) => `  ${mod}Module,`).join("\n");

  const content = `// Bu dosya scripts/sync-schemas.ts ve syncModuleRegistry tarafından otomatik üretilir.
// Dışarıdan modül ekleyen AI agentlar veya geliştiriciler elle düzenlemek zorunda değildir.

import type { ModuleConfig } from "@/shared/types/module";

${imports}

/**
 * Projedeki TÜM kayıtlı modüllerin dinamik listesi.
 */
export const allModules: ModuleConfig[] = [
${listItems}
];

/** Geriye dönük uyumluluk için varsayılan registry */
export const registry: ModuleConfig[] = allModules;
`;

  try {
    fs.writeFileSync(REGISTRY_FILE, content, "utf8");
  } catch (err) {
    console.error("[sync-registry] Failed to write src/registry.ts:", err);
  }

  syncDashboardCards(validModules);
  syncModuleAi(validModules);
  syncConventionFile(validModules, "demo.ts", "demo", DEMO_FILE, "ModuleDemo", "@/shared/demo/define", "moduleDemoRegistry", "Modüllerin örnek veri üreticileri (src/modules/<modül>/demo.ts).");
  syncConventionFile(validModules, "lifecycle.ts", "lifecycle", LIFECYCLE_FILE, "ModuleLifecycle", "@/shared/modules/lifecycle", "moduleLifecycleRegistry", "Modül yaşam döngüsü kancaları (src/modules/<modül>/lifecycle.ts), ör. kapatılırken temizlik.");
  syncPermissionResources(validModules);

  return { registered: validModules };
}

/**
 * Panel kartları kaydı: `cards/index.ts` dosyası olan modüllerin `cards` dizisini
 * src/dashboard-cards.ts içinde toplar (yalnızca sunucu; kart render'ı sorgu yapar).
 */
function syncDashboardCards(modules: string[]): void {
  const withCards = modules.filter((mod) =>
    ["index.ts", "index.tsx"].some((file) => fs.existsSync(path.join(MODULES_DIR, mod, "cards", file))),
  );
  const imports = withCards
    .map((mod) => `import { cards as ${mod}Cards } from "@/modules/${mod}/cards";`)
    .join("\n");
  const listItems = withCards.map((mod) => `  { moduleKey: "${mod}", cards: ${mod}Cards },`).join("\n");

  const content = `// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { DashboardCardDefinition } from "@/shared/types/dashboard";
${imports ? `\n${imports}\n` : ""}
/** Modüllerin panele sunduğu kartlar (src/modules/<modül>/cards/index.ts). */
export const dashboardCards: { moduleKey: string; cards: DashboardCardDefinition[] }[] = ${listItems ? `[\n${listItems}\n]` : "[]"};
`;

  try {
    const current = fs.existsSync(CARDS_FILE) ? fs.readFileSync(CARDS_FILE, "utf8") : "";
    if (current !== content) fs.writeFileSync(CARDS_FILE, content, "utf8");
  } catch (err) {
    console.error("[sync-registry] Failed to write src/dashboard-cards.ts:", err);
  }
}

/**
 * Sözleşme dosyası kaydı: `<file>` içeren modüllerin `<exportName>` dışa aktarımını tek listede toplar.
 */
function syncConventionFile(
  modules: string[],
  file: string,
  exportName: string,
  target: string,
  typeName: string,
  typeModule: string,
  listName: string,
  doc: string,
): void {
  const base = file.replace(/\.ts$/, "");
  const withFile = modules.filter((mod) => fs.existsSync(path.join(MODULES_DIR, mod, file)));
  const suffix = exportName.charAt(0).toUpperCase() + exportName.slice(1);
  const imports = withFile.map((mod) => `import { ${exportName} as ${mod}${suffix} } from "@/modules/${mod}/${base}";`).join("\n");
  const listItems = withFile.map((mod) => `  ${mod}${suffix},`).join("\n");
  const content = `// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ${typeName} } from "${typeModule}";
${imports ? `\n${imports}\n` : ""}
/** ${doc} */
export const ${listName}: ${typeName}[] = ${listItems ? `[\n${listItems}\n]` : "[]"};
`;
  try {
    const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
    if (current !== content) fs.writeFileSync(target, content, "utf8");
  } catch (err) {
    console.error(`[sync-registry] Failed to write ${path.relative(ROOT_DIR, target)}:`, err);
  }
}

/**
 * Asistan kaydı: `ai.ts` dosyası olan modüllerin `ai` sözleşmesini src/ai-registry.ts içinde
 * toplar (bkz. src/shared/ai/define.ts). AI modülü araçları ve onay eylemlerini yalnızca buradan alır.
 */
function syncModuleAi(modules: string[]): void {
  const withAi = modules.filter((mod) => fs.existsSync(path.join(MODULES_DIR, mod, "ai.ts")));
  const imports = withAi.map((mod) => `import { ai as ${mod}Ai } from "@/modules/${mod}/ai";`).join("\n");
  const listItems = withAi.map((mod) => `  ${mod}Ai,`).join("\n");

  const content = `// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import "server-only";

import type { ModuleAi } from "@/shared/ai/define";
${imports ? `\n${imports}\n` : ""}
/** Modüllerin asistana sunduğu araçlar ve onay eylemleri (src/modules/<modül>/ai.ts). */
export const moduleAiRegistry: ModuleAi[] = ${listItems ? `[\n${listItems}\n]` : "[]"};
`;

  try {
    const current = fs.existsSync(AI_FILE) ? fs.readFileSync(AI_FILE, "utf8") : "";
    if (current !== content) fs.writeFileSync(AI_FILE, content, "utf8");
  } catch (err) {
    console.error("[sync-registry] Failed to write src/ai-registry.ts:", err);
  }
}

/**
 * İzin kaynakları kaydı: her modülün `permissions.ts` dosyasındaki tüm definePermissions
 * çıktılarını src/permissions-registry.ts içinde toplar. "Roller ve İzinler" ekranı ve rol
 * politikası kaynakları buradan okur; yeni modülün izinleri elle eklenmeden görünür.
 */
function syncPermissionResources(modules: string[]): void {
  const withPermissions = modules.filter((mod) => fs.existsSync(path.join(MODULES_DIR, mod, "permissions.ts")));
  const imports = withPermissions.map((mod) => `import * as ${mod}PermissionExports from "@/modules/${mod}/permissions";`).join("\n");
  const listItems = withPermissions.map((mod) => `  { moduleKey: "${mod}", definitions: definitionsOf(${mod}PermissionExports) },`).join("\n");

  const content = `// Bu dosya syncModuleRegistry tarafından otomatik üretilir (pnpm module:sync); elle düzenlemeyin.
import type { PermissionDefinition } from "@/shared/permissions/define";
import { settingsPermissions, systemPermissions } from "@/shared/permissions/system";
${imports ? `\n${imports}\n` : ""}
const isDefinition = (value: unknown): value is PermissionDefinition =>
  typeof value === "object" && value !== null && "resource" in value && "grants" in value;
const definitionsOf = (exports: Record<string, unknown>) => Object.values(exports).filter(isDefinition);

/** Modül → izin kaynakları (definePermissions). Sistem ayarları "system" altında. */
export const permissionResources: { moduleKey: string; definitions: PermissionDefinition[] }[] = [
${listItems}
  { moduleKey: "system", definitions: [systemPermissions, settingsPermissions] },
].map((entry, index, all) => ({
  // Aynı kaynak birden fazla yerde dışa aktarılmışsa yalnızca ilk görüldüğü modülde listelenir.
  ...entry,
  definitions: entry.definitions.filter((definition) => !all.slice(0, index).some((other) => other.definitions.some((seen) => seen.resource === definition.resource))),
}));
`;

  try {
    const current = fs.existsSync(PERMISSIONS_FILE) ? fs.readFileSync(PERMISSIONS_FILE, "utf8") : "";
    if (current !== content) fs.writeFileSync(PERMISSIONS_FILE, content, "utf8");
  } catch (err) {
    console.error("[sync-registry] Failed to write src/permissions-registry.ts:", err);
  }
}
