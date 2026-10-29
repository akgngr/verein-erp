import fs from "node:fs";
import path from "node:path";
import { SUPPORTED_LOCALES } from "@/i18n/config";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");
const MESSAGES_DIR = path.join(ROOT_DIR, "messages");
/** Kabuğa (src/app, ortak bileşenler) ait çevirilerin kaynağı. */
const SHELL_MESSAGES_DIR = path.join(MESSAGES_DIR, "shell");

/** Modül çevirisinde kök "nav" ad alanına birleştirilecek ayrılmış anahtar. */
const RESERVED_NAV_KEY = "nav";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Modül Çeviri Senkronizasyonu (Modular i18n):
 * messages/<locale>.json ÜRETİLEN dosyadır, elle düzenlenmez. Her senkronda baştan kurulur:
 *
 *   1. messages/shell/<locale>.json — kabuğa ait ad alanları (common, sidebar, panel, nav…)
 *   2. src/modules/<module>/messages/<locale>.json — [moduleKey] ad alanı altına AYNEN konur
 *
 * KARAR: Modül ad alanı birleştirilmez, değiştirilir; modülden silinen anahtar kökte kalmaz.
 * Modül çevirisindeki ayrılmış "nav" nesnesi (örn. { "nav": { "inventory": "Inventar" } })
 * modül ad alanına değil, kök "nav" ad alanına eklenir; sidebar `labelKey` değerleri böylece
 * kabuğa dokunmadan çevrilir.
 */
export function syncModuleTranslations(): {
  locales: string[];
  modulesMerged: Record<string, string[]>;
} {
  const result: { locales: string[]; modulesMerged: Record<string, string[]> } = {
    locales: [...SUPPORTED_LOCALES],
    modulesMerged: {},
  };

  if (!fs.existsSync(MODULES_DIR) || !fs.existsSync(SHELL_MESSAGES_DIR)) {
    return result;
  }

  const moduleNames = fs
    .readdirSync(MODULES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const locale of SUPPORTED_LOCALES) {
    result.modulesMerged[locale] = [];
    const shellFile = path.join(SHELL_MESSAGES_DIR, `${locale}.json`);
    const shell: unknown = fs.existsSync(shellFile) ? JSON.parse(fs.readFileSync(shellFile, "utf8")) : {};
    const output: Record<string, unknown> = isPlainObject(shell) ? { ...shell } : {};
    const nav: Record<string, unknown> = isPlainObject(output[RESERVED_NAV_KEY])
      ? { ...output[RESERVED_NAV_KEY] }
      : {};

    for (const moduleName of moduleNames) {
      // Standart messages/<locale>.json önceliklidir, i18n/<locale>.json geriye dönük desteklenir
      const candidateFiles = [
        path.join(MODULES_DIR, moduleName, "messages", `${locale}.json`),
        path.join(MODULES_DIR, moduleName, "i18n", `${locale}.json`),
      ];
      const moduleI18nFile = candidateFiles.find((f) => fs.existsSync(f));
      if (!moduleI18nFile) continue;

      try {
        const parsed: unknown = JSON.parse(fs.readFileSync(moduleI18nFile, "utf8"));
        const { [RESERVED_NAV_KEY]: moduleNav, ...moduleMessages } = isPlainObject(parsed) ? parsed : {};
        if (moduleName in output) {
          console.warn(`[sync-i18n] "${moduleName}" hem kabukta hem modülde tanımlı; modül kullanılır.`);
        }
        output[moduleName] = moduleMessages;
        if (isPlainObject(moduleNav)) Object.assign(nav, moduleNav);
        result.modulesMerged[locale].push(moduleName);
      } catch (err) {
        console.error(`[sync-i18n] Error reading module translations for ${moduleName} (${locale}):`, err);
      }
    }

    output[RESERVED_NAV_KEY] = nav;
    try {
      fs.writeFileSync(path.join(MESSAGES_DIR, `${locale}.json`), JSON.stringify(output, null, 2) + "\n", "utf8");
    } catch (err) {
      console.error(`[sync-i18n] Failed to write messages/${locale}.json:`, err);
    }
  }

  return result;
}
