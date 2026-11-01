import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkModuleDependencies } from "../src/shared/modules/module-deps";

const ROOT_DIR = process.cwd();
const MODULES_DIR = path.join(ROOT_DIR, "src", "modules");
const APP_DIR = path.join(ROOT_DIR, "src", "app", "(dashboard)", "(modules)");
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

const REQUIRED_ROLES = ["ADMIN", "BOARD", "SECRETARY", "TREASURER", "AUDITOR", "VIEWER", "TEACHER"];

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
  // İzin kaynakları: "Roller ve İzinler" ekranındaki etiket ve açıklama modülün mesajlarında.
  const permissionsPath = path.join(moduleDir, "permissions.ts");
  if (fs.existsSync(permissionsPath)) {
    for (const match of fs.readFileSync(permissionsPath, "utf8").matchAll(/definePermissions\(\s*["']([\w-]+)["']/g)) {
      required.push(`permissions.${match[1]}.label`, `permissions.${match[1]}.description`);
    }
  }
  // Modül rolleri (module.config.ts → roles): etiket ve kısa açıklama.
  const rolesBlock = config.match(/\broles:\s*\[([\s\S]*?)\]/);
  if (rolesBlock) {
    for (const match of rolesBlock[1].matchAll(/\bkey:\s*["']([\w-]+)["']/g)) required.push(`roles.${match[1]}.label`, `roles.${match[1]}.shortDesc`);
  }
  // Modül AI standardı (src/shared/ai/define.ts): her onay eyleminin kart metinleri olmalı.
  required.push(...checkModuleAi(moduleDir, problems));
  for (const key of required) {
    for (const [locale, json] of [["tr", trJson], ["de", deJson]] as const) {
      if (typeof lookupKey(json, key) !== "string") {
        problems.push(`messages/${locale}.json içinde '${key}' çevirisi yok.`);
      }
    }
  }
  return problems;
}

/**
 * `ai.ts` kuralları: server-only, defineModuleAi, `module` anahtarı klasör adıyla aynı, araç adları
 * snake_case. Dönen değer: eylem başına gereken çeviri anahtarları (<eylem>.kind|confirm|done).
 */
export function checkModuleAi(moduleDir: string, problems: string[]): string[] {
  const aiPath = path.join(moduleDir, "ai.ts");
  if (!fs.existsSync(aiPath)) return [];
  const text = fs.readFileSync(aiPath, "utf8");
  const moduleKey = path.basename(moduleDir);
  if (!text.includes('import "server-only"')) problems.push("ai.ts 'server-only' içe aktarmalı.");
  if (!/export const ai = defineModuleAi\(/.test(text)) problems.push("ai.ts 'export const ai = defineModuleAi({...})' biçiminde olmalı.");
  const declared = text.match(/\bmodule:\s*["']([\w-]+)["']/)?.[1];
  if (declared !== moduleKey) problems.push(`ai.ts module anahtarı '${declared ?? "?"}' klasör adı '${moduleKey}' ile aynı olmalı.`);
  for (const match of text.matchAll(/\bname:\s*["']([^"']+)["']/g)) {
    if (!/^[a-z][a-z0-9_]{2,63}$/.test(match[1])) problems.push(`ai.ts araç adı snake_case olmalı: ${match[1]}`);
  }
  const actions = [...text.matchAll(/^\s+([\w]+):\s*aiAction\(/gm)].map((match) => match[1]);
  for (const proposed of text.matchAll(/propose\(\{\s*action:\s*["']([\w]+)["']/g)) {
    if (!actions.includes(proposed[1])) problems.push(`ai.ts: önerilen eylem '${proposed[1]}' actions içinde tanımlı değil.`);
  }
  return actions.flatMap((action) => ["kind", "confirm", "done"].map((part) => `ai.${action}.${part}`));
}

/**
 * Yetki rol ADINA göre verilmez: `user.role === "BOARD"` gibi karşılaştırmalar özel rolleri ve
 * yöneticinin değişikliklerini devre dışı bırakır. Bunun yerine can(user.role, tanım, işlem).
 * İstisna: kullanıcılar modülü (kilitli Yönetici rolünün korunması çekirdek kuraldır).
 */
export function checkRoleNameChecks(moduleDir: string, moduleKey: string): string[] {
  if (moduleKey === "users") return [];
  const problems: string[] = [];
  const pattern = /\b(?:user|session\.user|currentUser|actor)\.role\s*[!=]==?\s*["'][A-Z_]+["']|["'][A-Z_]+["']\s*[!=]==?\s*(?:user|session\.user|currentUser|actor)\.role\b|ROLES?\b[^\n]*\.includes\(\s*(?:user\.)?role\s*\)/;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        fs.readFileSync(fullPath, "utf8").split("\n").forEach((line, index) => {
          if (pattern.test(line) && !line.includes("role-name-ok")) {
            problems.push(`${path.relative(moduleDir, fullPath)}:${index + 1} yetki rol adına göre denetleniyor; can(user.role, …) kullanın (rehber §8b).`);
          }
        });
      }
    }
  };
  walk(moduleDir);
  return problems;
}

const SEMVER = /^\d+\.\d+\.\d+$/;
const RELEASE_TYPES = new Set(["feature", "improvement", "fix", "security"]);

/** "1.2.3" karşılaştırması: a > b ise pozitif. */
export function compareSemver(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

/** Modül sürüm notları (releases.json): biçim, azalan sürüm sırası ve module.config.ts 'version' eşleşmesi. */
export function checkModuleReleases(moduleDir: string): string[] {
  const file = path.join(moduleDir, "releases.json");
  if (!fs.existsSync(file)) return ["Zorunlu 'releases.json' (modül sürüm notları) eksik."];
  const problems: string[] = [];
  let releases: { version?: string; date?: string; title?: { tr?: string; de?: string }; changes?: { type?: string; tr?: string; de?: string }[] }[];
  try {
    releases = JSON.parse(fs.readFileSync(file, "utf8")).releases;
  } catch (err) {
    return [`'releases.json' okunamadı: ${err instanceof Error ? err.message : String(err)}`];
  }
  if (!Array.isArray(releases) || releases.length === 0) return ["'releases.json' en az bir sürüm içermeli."];
  releases.forEach((release, index) => {
    const label = release.version ?? `#${index + 1}`;
    if (!release.version || !SEMVER.test(release.version)) problems.push(`releases.json: geçersiz sürüm '${label}' (x.y.z).`);
    if (!release.date || !/^\d{4}-\d{2}-\d{2}$/.test(release.date)) problems.push(`releases.json ${label}: tarih YYYY-MM-DD olmalı.`);
    if (!release.title?.tr || !release.title?.de) problems.push(`releases.json ${label}: title.tr ve title.de zorunlu.`);
    if (!release.changes?.length) problems.push(`releases.json ${label}: en az bir değişiklik olmalı.`);
    for (const change of release.changes ?? []) {
      if (!change.type || !RELEASE_TYPES.has(change.type) || !change.tr || !change.de) problems.push(`releases.json ${label}: her değişiklikte type (feature|improvement|fix|security), tr ve de olmalı.`);
    }
    const next = releases[index + 1];
    if (next?.version && release.version && SEMVER.test(release.version) && SEMVER.test(next.version) && compareSemver(release.version, next.version) <= 0) {
      problems.push(`releases.json: sürümler yeniden eskiye sıralı olmalı (${release.version} ≤ ${next.version}).`);
    }
  });
  const configText = fs.readFileSync(path.join(moduleDir, "module.config.ts"), "utf8");
  const version = configText.match(/^\s*version:\s*["']([^"']+)["']/m)?.[1];
  if (!version) problems.push("module.config.ts içinde 'version' eksik (releases.json en üstteki sürümle aynı olmalı).");
  else if (version !== releases[0].version) problems.push(`module.config.ts version (${version}) releases.json en üstteki sürümle (${releases[0].version}) aynı değil.`);
  return [...new Set(problems)];
}

/** Modüllerin birbirinin `server` API'sini onaysız kullanmasını engelleyen erişim denetimi. */
const ACCESS_EXEMPT_MODULES = new Set(["auth"]); // oturum ve createAction: her modülün altyapısı

/** İçe aktarılan adın gerektirdiği erişim türü (ad kuralına göre). */
export function operationFor(name: string): "read" | "write" | "delete" {
  if (/^(delete|remove|anonymi[sz]e|purge)/i.test(name)) return "delete";
  if (/Action$/.test(name) || /^(create|update|record|reverse|send|save|set|add|link|unlink|make|issue|run|toggle|change|void|mark|generate|upload|import|write|approve|close|unlock)/.test(name)) {
    return "write";
  }
  return "read";
}

/** Kaynak dosyalardaki `@/modules/<m>/server` içe aktarımları: hedef modül → kullanılan adlar. */
export function findServerImports(moduleDir: string, moduleKey: string): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const text = fs.readFileSync(fullPath, "utf8");
        for (const match of text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']@\/modules\/([a-z0-9-]+)\/server["']/g)) {
          const target = match[2];
          if (target === moduleKey || ACCESS_EXEMPT_MODULES.has(target) || /^import\s+type/.test(match[0])) continue;
          const names = match[1]
            .split(",")
            .map((part) => part.trim())
            .filter((part) => part && !part.startsWith("type "))
            .map((part) => part.split(/\s+as\s+/)[0].trim());
          if (!found.has(target)) found.set(target, new Set());
          for (const name of names) found.get(target)!.add(name);
        }
      }
    }
  };
  walk(moduleDir);
  return found;
}

/** module.config.ts içindeki `access` bildirimleri: hedef modül → işlemler. */
export function declaredAccess(configText: string): Map<string, Set<string>> {
  const declared = new Map<string, Set<string>>();
  for (const match of configText.matchAll(/module:\s*["']([a-z0-9-]+)["']\s*,\s*operations:\s*\[([^\]]*)\]/g)) {
    declared.set(match[1], new Set([...match[2].matchAll(/["'](read|write|delete)["']/g)].map((op) => op[1])));
  }
  return declared;
}

/** Prisma model → sahibi modül (src/modules/<m>/schema.prisma). */
function modelOwners(modulesDir: string): Map<string, string> {
  const owners = new Map<string, string>();
  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    const schemaPath = path.join(modulesDir, entry.name, "schema.prisma");
    if (!entry.isDirectory() || !fs.existsSync(schemaPath)) continue;
    for (const match of fs.readFileSync(schemaPath, "utf8").matchAll(/^model\s+(\w+)/gm)) {
      owners.set(match[1].charAt(0).toLowerCase() + match[1].slice(1), entry.name);
    }
  }
  return owners;
}

/** Başka modülün tablosuna doğrudan (getDb/tx) erişim: onay mekanizmasını atlar, yasaktır. */
function findForeignTableAccess(moduleDir: string, moduleKey: string): string[] {
  // auth: oturum altyapısı users tablosunu okur/yazar (aynı kimlik alanı; bkz. ACCESS_EXEMPT_MODULES).
  if (ACCESS_EXEMPT_MODULES.has(moduleKey)) return [];
  const owners = modelOwners(path.dirname(moduleDir));
  const problems = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (/\.(ts|tsx)$/.test(entry.name)) {
        const text = fs.readFileSync(fullPath, "utf8");
        for (const match of text.matchAll(/\b(?:db|tx|prisma|getDb\(\))\.([a-z]\w*)\.(?:find\w*|create\w*|update\w*|delete\w*|upsert|count|aggregate|groupBy)\b/g)) {
          const owner = owners.get(match[1]);
          if (owner && owner !== moduleKey) {
            problems.add(`'${owner}' modülünün '${match[1]}' tablosuna doğrudan erişiliyor (${path.relative(moduleDir, fullPath)}); o modülün server API'sini kullanın ve 'access' içinde bildirin.`);
          }
        }
      }
    }
  };
  walk(moduleDir);
  return [...problems];
}

function checkModuleAccess(moduleDir: string, moduleKey: string, configText: string, trJson: unknown, deJson: unknown): string[] {
  const problems: string[] = findForeignTableAccess(moduleDir, moduleKey);
  const declared = declaredAccess(configText);
  for (const [target, names] of findServerImports(moduleDir, moduleKey)) {
    const needed = new Set([...names].map(operationFor));
    const granted = declared.get(target);
    if (!granted) {
      problems.push(
        `'${target}' modülünün sunucu API'si kullanılıyor (${[...names].join(", ")}) ama module.config.ts 'access' içinde bildirilmemiş: { module: "${target}", operations: [${[...needed].map((op) => `"${op}"`).join(", ")}] }`,
      );
      continue;
    }
    const missing = [...needed].filter((op) => !granted.has(op));
    if (missing.length > 0) {
      problems.push(`'${target}' için bildirilen erişim yetersiz; eksik işlem: ${missing.join(", ")} (${[...names].join(", ")}).`);
    }
  }
  for (const target of declared.keys()) {
    if (!fs.existsSync(path.join(path.dirname(moduleDir), target, "module.config.ts"))) {
      problems.push(`'access' içinde bilinmeyen modül: '${target}'.`);
    }
    for (const [locale, json] of [["tr", trJson], ["de", deJson]] as const) {
      if (typeof lookupKey(json, `access.${target}`) !== "string") {
        problems.push(`messages/${locale}.json içinde erişim gerekçesi 'access.${target}' yok (onay ekranında gösterilir).`);
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
      errors.push(...checkRoleNameChecks(moduleDir, moduleKey));
      const dependencyConfigPath = path.join(moduleDir, "module.config.ts");
      if (fs.existsSync(dependencyConfigPath)) errors.push(...checkModuleDependencies(moduleDir, moduleKey, fs.readFileSync(dependencyConfigPath, "utf8")));
      const accessConfigPath = path.join(moduleDir, "module.config.ts");
      if (fs.existsSync(accessConfigPath)) {
        errors.push(...checkModuleAccess(moduleDir, moduleKey, fs.readFileSync(accessConfigPath, "utf8"), trJson, deJson));
      }
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

  errors.push(...checkModuleReleases(moduleDir));

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
