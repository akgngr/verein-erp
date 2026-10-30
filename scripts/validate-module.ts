import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");
const APP_DIR = path.join(ROOT_DIR, "src", "app", "(dashboard)");
const MIGRATIONS_DIR = path.join(ROOT_DIR, "prisma", "schema", "migrations");

export interface ModuleValidationResult {
  moduleKey: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  info: {
    label?: string;
    category?: "CORE" | "OFFICIAL" | "EXTENSION" | string;
    hasSchema?: boolean;
    hasMenu?: boolean;
    hasTranslations?: boolean;
    hasPermissions?: boolean;
    hasAppRoute?: boolean;
  };
}

const REQUIRED_ROLES = ["ADMIN", "BOARD", "SECRETARY", "TREASURER", "AUDITOR", "VIEWER"];

/**
 * Belirli bir modülü Verein ERP standartlarına göre denetler.
 */

/** Nokta yolundaki değeri döndürür (yoksa undefined). */
function lookupKey(messages: unknown, dotted: string): unknown {
  let current: unknown = messages;
  for (const part of dotted.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/** Yaprak anahtarların listesi ("a.b.c"). */
function leafKeys(messages: unknown, prefix = ""): string[] {
  if (typeof messages !== "object" || messages === null) return [prefix];
  return Object.entries(messages as Record<string, unknown>).flatMap(([key, value]) =>
    leafKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

/**
 * Çeviri bütünlüğü: tr/de anahtar eşliği; nav `labelKey` → `nav.<key>`;
 * menü öğesi → `menu.<key>`; sistem listesi için `module.label`/`module.description`;
 * panel kartlarının `titleKey`/`descriptionKey` anahtarları.
 */
function checkModuleMessages(moduleDir: string, trJson: unknown, deJson: unknown): string[] {
  const problems: string[] = [];
  const trKeys = new Set(leafKeys(trJson));
  const deKeys = new Set(leafKeys(deJson));
  const onlyTr = [...trKeys].filter((key) => !deKeys.has(key));
  const onlyDe = [...deKeys].filter((key) => !trKeys.has(key));
  if (onlyTr.length) problems.push(`de.json eksik anahtarlar: ${onlyTr.slice(0, 10).join(", ")}`);
  if (onlyDe.length) problems.push(`tr.json eksik anahtarlar: ${onlyDe.slice(0, 10).join(", ")}`);

  const configPath = path.join(moduleDir, "module.config.ts");
  if (!fs.existsSync(configPath)) return problems;
  const config = fs.readFileSync(configPath, "utf8");
  const required = ["module.label", "module.description"];
  for (const match of config.matchAll(/labelKey:\s*["']([\w-]+)["']/g)) required.push(`nav.${match[1]}`);
  const menuBlock = config.match(/\n\s*menu:\s*\[([\s\S]*?)\n\s*\]/);
  if (menuBlock) {
    for (const match of menuBlock[1].matchAll(/\bkey:\s*["']([\w-]+)["']/g)) required.push(`menu.${match[1]}`);
  }
  // Panel kartları: başlık ve açıklama anahtarları modül mesajlarında olmalı.
  for (const file of ["index.tsx", "index.ts"]) {
    const cardsPath = path.join(moduleDir, "cards", file);
    if (!fs.existsSync(cardsPath)) continue;
    const cardsText = fs.readFileSync(cardsPath, "utf8");
    for (const match of cardsText.matchAll(/(?:titleKey|descriptionKey):\s*["']([\w.-]+)["']/g)) required.push(match[1]);
  }
  for (const key of required) {
    for (const [locale, json] of [["tr", trJson], ["de", deJson]] as const) {
      if (typeof lookupKey(json, key) !== "string") {
        problems.push(`messages/${locale}.json içinde '${key}' çevirisi yok.`);
      }
    }
  }
  return problems;
}

export function validateModule(moduleKey: string, customModulesDir?: string): ModuleValidationResult {
  const baseModulesDir = customModulesDir || MODULES_DIR;
  const moduleDir = path.join(baseModulesDir, moduleKey);

  const errors: string[] = [];
  const warnings: string[] = [];
  const info: ModuleValidationResult["info"] = {};

  // 1. Modül adı ve dizin kontrolü
  if (!/^[a-z0-9_-]+$/.test(moduleKey)) {
    errors.push(`Modül anahtarı sadece küçük harf, rakam, tire ve alt çizgi içerebilir: "${moduleKey}"`);
  }

  if (!fs.existsSync(moduleDir) || !fs.statSync(moduleDir).isDirectory()) {
    errors.push(`Modül dizini bulunamadı: ${moduleDir}`);
    return { moduleKey, valid: false, errors, warnings, info };
  }

  // 2. module.config.ts kontrolü
  const configPath = path.join(moduleDir, "module.config.ts");
  if (!fs.existsSync(configPath)) {
    errors.push("Zorunlu 'module.config.ts' dosyası eksik.");
  } else {
    try {
      const configText = fs.readFileSync(configPath, "utf8");

      if (!configText.includes("export const moduleConfig")) {
        errors.push("'module.config.ts' içinde 'export const moduleConfig' tanımı bulunamadı.");
      }

      // Key kontrolü
      const keyMatch = configText.match(/key:\s*["']([^"']+)["']/);
      if (keyMatch) {
        if (keyMatch[1] !== moduleKey) {
          errors.push(`'module.config.ts' içindeki key ('${keyMatch[1]}') klasör adıyla ('${moduleKey}') uyuşmuyor.`);
        }
      } else {
        warnings.push("'module.config.ts' dosyasında 'key' özelliği açıkça tespit edilemedi.");
      }

      // Label kontrolü
      const labelMatch = configText.match(/label:\s*["']([^"']+)["']/);
      if (labelMatch) {
        info.label = labelMatch[1];
      }

      // Category kontrolü
      const catMatch = configText.match(/category:\s*["'](CORE|OFFICIAL|EXTENSION)["']/);
      if (catMatch) {
        info.category = catMatch[1] as "CORE" | "OFFICIAL" | "EXTENSION";
      } else {
        errors.push("Modül kategorisi 'CORE', 'OFFICIAL' veya 'EXTENSION' olmalıdır.");
      }

      // hasSchema kontrolü
      info.hasSchema = configText.includes("hasSchema: true");

      // nav kontrolü
      if (!configText.includes("nav:")) {
        warnings.push("'module.config.ts' içinde 'nav' özelliği bulunamadı.");
      }
    } catch (err) {
      errors.push(`'module.config.ts' okunamadı: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 3. Modül menüsü standardı: menü module.config.ts içinde `menu` olarak tanımlanır.
  // Bağlantıların sayfa/rota karşılığı ve çevirileri tests/navigation.test.ts'te doğrulanır.
  if (fs.existsSync(path.join(moduleDir, "menu", "top.json"))) {
    errors.push(
      "'menu/top.json' eski standarttır (üst bar kaldırıldı). Modül menüsünü 'module.config.ts' içinde 'menu: [...]' olarak tanımlayın.",
    );
  }
  if (fs.existsSync(configPath)) {
    info.hasMenu = /\n\s*menu:\s*\[/.test(fs.readFileSync(configPath, "utf8"));
  }

  // 4. permissions.ts kontrolü
  const permPath = path.join(moduleDir, "permissions.ts");
  if (!fs.existsSync(permPath)) {
    errors.push("Zorunlu 'permissions.ts' dosyası eksik.");
  } else {
    try {
      const permText = fs.readFileSync(permPath, "utf8");
      info.hasPermissions = true;
      if (moduleKey !== "auth") {
        const missingRoles = REQUIRED_ROLES.filter((role) => !permText.includes(role));
        if (missingRoles.length > 0) {
          warnings.push(`'permissions.ts' şu sistem rollerini içermiyor: ${missingRoles.join(", ")}`);
        }
      }
    } catch (err) {
      errors.push(`'permissions.ts' okunamadı: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 5. messages/ (i18n) kontrolü
  const trCandidates = [
    path.join(moduleDir, "messages", "tr.json"),
    path.join(moduleDir, "i18n", "tr.json"),
  ];
  const deCandidates = [
    path.join(moduleDir, "messages", "de.json"),
    path.join(moduleDir, "i18n", "de.json"),
  ];
  const trPath = trCandidates.find((f) => fs.existsSync(f));
  const dePath = deCandidates.find((f) => fs.existsSync(f));

  if (!trPath || !dePath) {
    errors.push("Çoklu dil (i18n) dosyaları eksik ('messages/tr.json' ve 'messages/de.json' bulunmalıdır).");
  } else {
    try {
      const trJson = JSON.parse(fs.readFileSync(trPath, "utf8"));
      const deJson = JSON.parse(fs.readFileSync(dePath, "utf8"));
      if (typeof trJson !== "object" || trJson === null || Array.isArray(trJson)) {
        errors.push("'messages/tr.json' geçerli bir JSON nesnesi olmalıdır.");
      }
      if (typeof deJson !== "object" || deJson === null || Array.isArray(deJson)) {
        errors.push("'messages/de.json' geçerli bir JSON nesnesi olmalıdır.");
      }
      info.hasTranslations = true;
      errors.push(...checkModuleMessages(moduleDir, trJson, deJson));
    } catch (err) {
      errors.push(`Çeviri JSON dosyaları çözümlenemedi: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 6. Public Giriş Noktaları (index.ts, server.ts, ui.ts)
  const indexPath = path.join(moduleDir, "index.ts");
  if (!fs.existsSync(indexPath)) {
    errors.push("İzomorfik public giriş noktası 'index.ts' eksik.");
  } else {
    const indexText = fs.readFileSync(indexPath, "utf8");
    if (indexText.includes('import "server-only"') || indexText.includes("import 'server-only'")) {
      errors.push("'index.ts' izomorfik bir giriş noktasıdır; 'server-only' İÇEREMEZ!");
    }
  }

  const serverPath = path.join(moduleDir, "server.ts");
  if (!fs.existsSync(serverPath)) {
    errors.push("Sunucu public giriş noktası 'server.ts' eksik.");
  } else {
    const serverText = fs.readFileSync(serverPath, "utf8");
    if (!serverText.includes("server-only")) {
      warnings.push("'server.ts' dosyasının başında 'import \"server-only\";' bulunmalıdır.");
    }
  }

  const uiPath = path.join(moduleDir, "ui.ts");
  if (!fs.existsSync(uiPath)) {
    errors.push("UI public giriş noktası 'ui.ts' eksik.");
  }

  // 7. Prisma Şema kontrolü (hasSchema true ise)
  if (info.hasSchema) {
    const schemaCandidates = [
      path.join(moduleDir, "schema.prisma"),
      path.join(moduleDir, "prisma", "schema.prisma"),
    ];
    const schemaFile = schemaCandidates.find((f) => fs.existsSync(f));
    if (!schemaFile) {
      errors.push("module.config.ts içinde 'hasSchema: true' belirtilmiş fakat 'schema.prisma' dosyası bulunamadı.");
    } else {
      const schemaText = fs.readFileSync(schemaFile, "utf8");
      if (!schemaText.includes("model ")) {
        warnings.push("'schema.prisma' dosyası herhangi bir 'model' tanımı içermiyor.");
      }
      // A-1.6: Şemadaki her tablo bir migration ile oluşturulmuş olmalı.
      // `prisma db push` migration üretmez; üretimdeki `prisma migrate deploy`
      // migration'ı olmayan tabloyu hiç oluşturmaz.
      const migrationSql = readAllMigrationSql();
      for (const tableName of listSchemaTableNames(schemaText)) {
        if (!migrationSql.includes(`CREATE TABLE "${tableName}"`)) {
          errors.push(
            `Tablo "${tableName}" için migration bulunamadı. 'pnpm db:migrate --name add_${moduleKey}' ile migration üretin ('db push' migration oluşturmaz).`,
          );
        }
      }

      // EXTENSION modüller için çakışma önleyici @@map kuralı kontrolü
      if (info.category === "EXTENSION") {
        const mapMatches = [...schemaText.matchAll(/@@map\(["']([^"']+)["']\)/g)];
        for (const match of mapMatches) {
          const tableName = match[1];
          if (!tableName.startsWith(`${moduleKey}_`) && tableName !== moduleKey) {
            warnings.push(
              `Eklenti tablosu @@map("${tableName}") modül ad alanı (${moduleKey}_) ile başlamalıdır.`,
            );
          }
        }
      }
    }
  }

  // 8. Dashboard sayfa kontrolü (modül içinde src/modules/<module>/page.tsx veya app altında)
  if (info.category !== "CORE" && moduleKey !== "auth") {
    const internalPage = path.join(moduleDir, "page.tsx");
    const directAppPage = path.join(APP_DIR, moduleKey, "page.tsx");
    
    // Alternatif rota eşleşmesi için module.config.ts içindeki href taranır
    const configText = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
    const hrefMatches = [...configText.matchAll(/href:\s*["']\/([^"']+)["']/g)];
    
    let hasMatchingRoute = fs.existsSync(internalPage) || fs.existsSync(directAppPage);
    for (const match of hrefMatches) {
      const routeSegment = match[1];
      const routeFile = path.join(APP_DIR, routeSegment, "page.tsx");
      if (fs.existsSync(routeFile)) {
        hasMatchingRoute = true;
        break;
      }
    }

    info.hasAppRoute = hasMatchingRoute;
    if (!hasMatchingRoute) {
      warnings.push(`Modül için dashboard sayfası bulunamadı (src/modules/${moduleKey}/page.tsx oluşturulmalıdır).`);
    }
  }

  // 9. Katı modül sınırları / Yasa dışı import taraması
  const tsFiles = getAllTsFiles(moduleDir);
  for (const file of tsFiles) {
    const content = fs.readFileSync(file, "utf8");

    // Yasak 1: Başka modüllerin iç dosyalarına erişim (sadece @/modules/<target>, @/modules/<target>/server, @/modules/<target>/ui, @/modules/<target>/page, @/modules/<target>/edge serbesttir)
    const importMatches = [...content.matchAll(/from\s+["']@\/modules\/([^"']+)["']/g)];
    for (const match of importMatches) {
      const importPath = match[1];
      const parts = importPath.split("/");
      const targetModule = parts[0];
      const subPath = parts.slice(1).join("/");

      // Kendi modülü içindeki importları atla
      if (targetModule === moduleKey) continue;

      // Public giriş noktaları serbest
      if (!subPath || subPath === "server" || subPath === "ui" || subPath === "edge" || subPath === "page") {
        continue;
      }

      errors.push(
        `Kural ihlali (${path.relative(ROOT_DIR, file)}): Başka modülün iç dosyası doğrudan import edilmiş -> "@/modules/${importPath}". Sadece public girişler serbesttir (@/modules/${targetModule}, @/modules/${targetModule}/server, @/modules/${targetModule}/ui).`,
      );
    }

    // Yasak 2: src/app importu
    const badAppMatches = [...content.matchAll(/from\s+["']@\/app\/([^"']+)["']/g)];
    for (const match of badAppMatches) {
      errors.push(
        `Kural ihlali (${path.relative(ROOT_DIR, file)}): Modül katmanı src/app'i import edemez -> "@/app/${match[1]}".`,
      );
    }
  }

  return {
    moduleKey,
    valid: errors.length === 0,
    errors,
    warnings,
    info,
  };
}

/** Şemadaki modellerin veritabanı tablo adları (@@map varsa o, yoksa model adı). */
export function listSchemaTableNames(schemaText: string): string[] {
  const tables: string[] = [];
  for (const match of schemaText.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const mapMatch = match[2].match(/@@map\(\s*["']([^"']+)["']\s*\)/);
    tables.push(mapMatch ? mapMatch[1] : match[1]);
  }
  return tables;
}

/** prisma/schema/migrations altındaki tüm migration.sql içeriklerini birleştirir. */
function readAllMigrationSql(): string {
  if (!fs.existsSync(MIGRATIONS_DIR)) return "";
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(MIGRATIONS_DIR, entry.name, "migration.sql"))
    .filter((file) => fs.existsSync(file))
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
}

/**
 * Modül dizini içindeki tüm TypeScript dosyalarını özyinelemeli toplar.
 */
function getAllTsFiles(dir: string): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".next") {
        results = results.concat(getAllTsFiles(fullPath));
      }
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * src/modules/ altındaki tüm modülleri denetler.
 */
export function validateAllModules(customModulesDir?: string): ModuleValidationResult[] {
  const baseDir = customModulesDir || MODULES_DIR;
  if (!fs.existsSync(baseDir)) return [];
  const entries = fs.readdirSync(baseDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("temp-") && !e.name.startsWith("."))
    .map((e) => validateModule(e.name, baseDir));
}

// Doğrudan CLI üzerinden çağrıldığında
const isCLI =
  process.argv[1] &&
  (process.argv[1] === import.meta.filename ||
    pathToFileURL(process.argv[1]).href === import.meta.url ||
    path.basename(process.argv[1]).includes("validate-module"));

if (isCLI) {
  const targetModule = process.argv[2];
  console.log("\n========================================================");
  console.log("       🔍 Verein ERP Modül Standart Denetimi           ");
  console.log("========================================================\n");

  const results: ModuleValidationResult[] = targetModule
    ? [validateModule(targetModule)]
    : validateAllModules();

  let hasErrors = false;

  for (const res of results) {
    const statusIcon = res.valid ? "✅" : "❌";
    const catBadge = res.info.category ? `[${res.info.category}]` : "";
    console.log(`${statusIcon} Modül: \x1b[1m${res.moduleKey}\x1b[0m ${catBadge} — ${res.info.label || "Başlıksız"}`);

    if (res.errors.length > 0) {
      hasErrors = true;
      for (const err of res.errors) {
        console.log(`   \x1b[31m✖ Hata:\x1b[0m ${err}`);
      }
    }

    if (res.warnings.length > 0) {
      for (const warn of res.warnings) {
        console.log(`   \x1b[33m▲ Uyarı:\x1b[0m ${warn}`);
      }
    }

    if (res.valid && res.warnings.length === 0) {
      const menuInfo = res.info.hasMenu ? " | Modül menüsü" : "";
      console.log(`   \x1b[32m✔ Tam uyumlu:\x1b[0m i18n, Yetki, Schema (${res.info.hasSchema ? "var" : "yok"}), Public APIs (index, server, ui)${menuInfo}`);
    }
    console.log("");
  }

  const passedCount = results.filter((r) => r.valid).length;
  console.log("--------------------------------------------------------");
  console.log(`Toplam: ${results.length} modül | \x1b[32m${passedCount} Başarılı\x1b[0m | \x1b[31m${results.length - passedCount} Hatalı\x1b[0m`);
  console.log("--------------------------------------------------------\n");

  if (hasErrors) {
    process.exit(1);
  }
}
