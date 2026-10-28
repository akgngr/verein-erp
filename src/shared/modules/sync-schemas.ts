import fs from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");
const PRISMA_SCHEMA_DIR = path.join(ROOT_DIR, "prisma", "schema");

/**
 * Otomatik Prisma Şema Senkronizasyonu:
 * Her modülün içindeki src/modules/<modul>/schema.prisma dosyasını bulur
 * ve prisma/schema/<modul>.prisma içerisine sembolik bağlantı (symlink)
 * veya kopya olarak bağlar.
 */
export function syncModuleSchemas(): { synced: string[]; removed: string[] } {
  if (!fs.existsSync(PRISMA_SCHEMA_DIR)) {
    fs.mkdirSync(PRISMA_SCHEMA_DIR, { recursive: true });
  }

  const synced: string[] = [];
  const removed: string[] = [];

  if (!fs.existsSync(MODULES_DIR)) {
    return { synced, removed };
  }

  const moduleEntries = fs.readdirSync(MODULES_DIR, { withFileTypes: true });
  const activeModuleNames = new Set<string>();

  for (const entry of moduleEntries) {
    if (!entry.isDirectory()) continue;
    const moduleName = entry.name;
    
    // Hem prisma/schema.prisma hem de doğrudan schema.prisma desteklenir
    const candidatePaths = [
      path.join(MODULES_DIR, moduleName, "prisma", "schema.prisma"),
      path.join(MODULES_DIR, moduleName, "schema.prisma"),
    ];
    const moduleSchemaPath = candidatePaths.find((p) => fs.existsSync(p));

    if (moduleSchemaPath) {
      activeModuleNames.add(moduleName);
      const targetSchemaPath = path.join(PRISMA_SCHEMA_DIR, `${moduleName}.prisma`);

      let needsLink = true;
      try {
        const stats = fs.lstatSync(targetSchemaPath);
        if (stats.isSymbolicLink()) {
          const currentTarget = fs.readlinkSync(targetSchemaPath);
          const resolvedCurrent = path.resolve(PRISMA_SCHEMA_DIR, currentTarget);
          if (resolvedCurrent === path.resolve(moduleSchemaPath)) {
            needsLink = false;
          } else {
            fs.unlinkSync(targetSchemaPath);
          }
        } else {
          const currentContent = fs.readFileSync(targetSchemaPath, "utf8");
          const moduleContent = fs.readFileSync(moduleSchemaPath, "utf8");
          if (currentContent === moduleContent) {
            needsLink = false;
          } else {
            fs.unlinkSync(targetSchemaPath);
          }
        }
      } catch {
        needsLink = true;
      }

      if (needsLink) {
        try {
          const relPath = path.relative(PRISMA_SCHEMA_DIR, moduleSchemaPath);
          fs.symlinkSync(relPath, targetSchemaPath);
        } catch {
          fs.copyFileSync(moduleSchemaPath, targetSchemaPath);
        }
        synced.push(moduleName);
      }
    }
  }

  const prismaFiles = fs.readdirSync(PRISMA_SCHEMA_DIR);
  for (const file of prismaFiles) {
    if (file === "base.prisma" || file === "migrations") continue;
    if (file.endsWith(".prisma")) {
      const moduleName = file.replace(/\.prisma$/, "");
      if (!activeModuleNames.has(moduleName)) {
        const filePath = path.join(PRISMA_SCHEMA_DIR, file);
        try {
          fs.unlinkSync(filePath);
          removed.push(file);
        } catch {
          // Yoksay
        }
      }
    }
  }

  return { synced, removed };
}
