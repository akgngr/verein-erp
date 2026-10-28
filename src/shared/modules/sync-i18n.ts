import fs from "node:fs";
import path from "node:path";
import { SUPPORTED_LOCALES } from "@/i18n/config";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");
const MESSAGES_DIR = path.join(ROOT_DIR, "messages");

/**
 * Modül Çeviri Senkronizasyonu (Modular i18n):
 * Her modülün içindeki src/modules/<module>/i18n/<locale>.json dosyalarını bulur
 * ve ana messages/<locale>.json dosyasına [moduleKey] ad alanı altında birleştirir.
 */
export function syncModuleTranslations(): {
  locales: string[];
  modulesMerged: Record<string, string[]>;
} {
  const result: { locales: string[]; modulesMerged: Record<string, string[]> } = {
    locales: [...SUPPORTED_LOCALES],
    modulesMerged: {},
  };

  if (!fs.existsSync(MODULES_DIR) || !fs.existsSync(MESSAGES_DIR)) {
    return result;
  }

  const moduleEntries = fs.readdirSync(MODULES_DIR, { withFileTypes: true });

  for (const locale of SUPPORTED_LOCALES) {
    result.modulesMerged[locale] = [];
    const mainMessageFile = path.join(MESSAGES_DIR, `${locale}.json`);

    let mainJson: Record<string, unknown> = {};
    if (fs.existsSync(mainMessageFile)) {
      try {
        mainJson = JSON.parse(fs.readFileSync(mainMessageFile, "utf8"));
      } catch (err) {
        console.error(`[sync-i18n] Failed to read ${mainMessageFile}:`, err);
      }
    }

    for (const entry of moduleEntries) {
      if (!entry.isDirectory()) continue;
      const moduleName = entry.name;
      // Standart messages/<locale>.json önceliklidir, i18n/<locale>.json geriye dönük desteklenir
      const candidateFiles = [
        path.join(MODULES_DIR, moduleName, "messages", `${locale}.json`),
        path.join(MODULES_DIR, moduleName, "i18n", `${locale}.json`),
      ];
      const moduleI18nFile = candidateFiles.find((f) => fs.existsSync(f));

      if (moduleI18nFile) {
        try {
          const moduleContent = JSON.parse(fs.readFileSync(moduleI18nFile, "utf8"));
          // Modül anahtarı altında derin birleştirme
          mainJson[moduleName] = {
            ...((mainJson[moduleName] as Record<string, unknown>) || {}),
            ...moduleContent,
          };
          result.modulesMerged[locale].push(moduleName);
        } catch (err) {
          console.error(
            `[sync-i18n] Error reading module translations for ${moduleName} (${locale}):`,
            err,
          );
        }
      }
    }

    try {
      fs.writeFileSync(mainMessageFile, JSON.stringify(mainJson, null, 2) + "\n", "utf8");
    } catch (err) {
      console.error(`[sync-i18n] Failed to write updated ${mainMessageFile}:`, err);
    }
  }

  return result;
}
