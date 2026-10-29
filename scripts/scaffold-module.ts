import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { syncModuleSchemas } from "../src/shared/modules/sync-schemas";
import { syncModuleTranslations } from "../src/shared/modules/sync-i18n";
import { syncModuleRegistry } from "../src/shared/modules/sync-registry";
import { syncModuleRoutes } from "../src/shared/modules/sync-routes";

import { moduleFiles, scaffoldNames } from "./scaffold-templates";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");

/**
 * Yeni modül iskeleti (`pnpm module:create <anahtar> "<TR adı>" "<DE adı>"`).
 * Üretilen modül hemen çalışır: liste + arama + sayfalama, sağ çekmecede form,
 * silme onayı, denetim kaydı, TR/DE çeviriler. Şablonlar: scripts/scaffold-templates.ts.
 */
export function scaffoldModule(
  moduleKey: string,
  options: { label?: string; labelDe?: string; description?: string; descriptionDe?: string } = {},
) {
  const names = scaffoldNames(moduleKey, {
    labelTr: options.label,
    labelDe: options.labelDe,
    descriptionTr: options.description,
    descriptionDe: options.descriptionDe,
  });
  const moduleDir = path.join(MODULES_DIR, names.key);
  if (fs.existsSync(moduleDir)) {
    throw new Error(`Modül dizini zaten mevcut: ${moduleDir}`);
  }

  for (const [relativePath, content] of Object.entries(moduleFiles(names))) {
    const target = path.join(moduleDir, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
  }

  // Şema, çeviri, kayıt ve rota köprülerini bağla; Prisma istemcisini yeni modelle üret.
  const schemaRes = syncModuleSchemas();
  const i18nRes = syncModuleTranslations();
  const regRes = syncModuleRegistry();
  const routeRes = syncModuleRoutes();
  let prismaGenerated = true;
  try {
    execSync("pnpm exec prisma generate", { cwd: ROOT_DIR, stdio: "ignore" });
  } catch {
    prismaGenerated = false;
  }

  return {
    key: names.key,
    labelDeMissing: !options.labelDe,
    directory: moduleDir,
    syncedSchemas: schemaRes.synced,
    mergedLocales: Object.keys(i18nRes.modulesMerged),
    totalRegisteredModules: regRes.registered.length,
    syncedRoutesCount: routeRes.syncedRoutes.length,
    prismaGenerated,
  };
}

// CLI doğrudan çalıştırma
const isCLI =
  process.argv[1] &&
  (process.argv[1] === import.meta.filename || path.basename(process.argv[1]).includes("scaffold-module"));

if (isCLI) {
  const [modName, labelTr, labelDe] = process.argv.slice(2);
  if (!modName) {
    console.error('Kullanım: pnpm module:create <modul-anahtari> "<Türkçe ad>" "<Almanca ad>"');
    process.exit(1);
  }
  try {
    const res = scaffoldModule(modName, { label: labelTr, labelDe });
    console.log(`[scaffold] ✅ "${res.key}" modülü oluşturuldu ve sisteme bağlandı: ${res.directory}`);
    if (res.labelDeMissing) {
      console.warn(`[scaffold] ⚠ Almanca ad verilmedi; messages/de.json içindeki nav/module/title metinlerini çevirin.`);
    }
    if (!res.prismaGenerated) {
      console.warn("[scaffold] ⚠ prisma generate çalıştırılamadı; elle çalıştırın: pnpm exec prisma generate");
    }
    console.log("Sonraki adımlar:");
    console.log("  1) pnpm db:migrate --name add-" + res.key + "   (tabloyu oluşturur)");
    console.log("  2) pnpm dev  →  /" + res.key);
    console.log("  3) pnpm module:validate && pnpm exec tsx scripts/check-hardcoded-text.ts");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[scaffold] ❌ Hata: ${message}`);
    process.exit(1);
  }
}
