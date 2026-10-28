import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");
const REGISTRY_FILE = path.join(ROOT_DIR, "src", "registry.ts");

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

  return { registered: validModules };
}
