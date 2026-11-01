/**
 * pnpm module:install <paket.vmod> [--force-downgrade]
 * İmzalı modül paketini doğrular ve kurar:
 *  1. imza + güvenilen yayıncı (src/config/trusted-publishers.json) + dosya yolları/hash'ler,
 *  2. mevcut modülden yüksek sürüm (yedek .module-backups/ altına alınır),
 *  3. dosyalar src/modules/<anahtar>/, migration'lar prisma/schema/migrations/ altına,
 *  4. modül doğrulaması (module:check kuralları); hata varsa geri alınır,
 *  5. pnpm module:sync + module:deps.
 * Ardından: pnpm db:deploy ve uygulamayı yeniden derleyip yayımlayın.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { packageFiles, readPackage, verifyPackage } from "../src/shared/marketplace/package";
import { loadTrustedPublishers } from "../src/shared/marketplace/trust";
import { compareSemver, validateModule } from "./validate-module";

const ROOT = process.cwd();
const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error("Kullanım: pnpm module:install <paket.vmod>");
  process.exit(1);
}
const appVersion = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version as string;
const pkg = readPackage(fs.readFileSync(file));
const result = verifyPackage(pkg, loadTrustedPublishers(ROOT), { appVersion });
if (!result.ok || !result.manifest) {
  console.error(`Paket reddedildi: ${result.errors.join(", ")}`);
  process.exit(1);
}
const manifest = result.manifest;
const moduleDir = path.join(ROOT, "src", "modules", manifest.key);
const configVersion = packageFiles(pkg)["module.config.ts"].toString("utf8").match(/^\s*version:\s*["']([^"']+)["']/m)?.[1];
if (configVersion !== manifest.version) {
  console.error(`module.config.ts sürümü (${configVersion}) manifest sürümüyle (${manifest.version}) aynı değil.`);
  process.exit(1);
}

let backup: string | null = null;
if (fs.existsSync(moduleDir)) {
  const current = fs.readFileSync(path.join(moduleDir, "module.config.ts"), "utf8").match(/^\s*version:\s*["']([^"']+)["']/m)?.[1] ?? "0.0.0";
  if (compareSemver(manifest.version, current) <= 0 && !process.argv.includes("--force-downgrade")) {
    console.error(`Kurulu sürüm ${current}; paket ${manifest.version}. Yalnızca daha yüksek sürüm kurulabilir.`);
    process.exit(1);
  }
  backup = path.join(ROOT, ".module-backups", `${manifest.key}-${current}-${Date.now()}`);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.renameSync(moduleDir, backup);
}

const writtenMigrations: string[] = [];
try {
  for (const [rel, content] of Object.entries(packageFiles(pkg))) {
    if (rel.startsWith("migrations/")) {
      const target = path.join(ROOT, "prisma", "schema", rel);
      if (!fs.existsSync(target)) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
        writtenMigrations.push(path.dirname(target));
      }
      continue;
    }
    const target = path.join(moduleDir, rel);
    if (!target.startsWith(moduleDir + path.sep)) throw new Error(`unsafe path ${rel}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  const validation = validateModule(manifest.key);
  if (!validation.valid) throw new Error(`Modül doğrulaması başarısız:\n  - ${validation.errors.join("\n  - ")}`);
} catch (error) {
  fs.rmSync(moduleDir, { recursive: true, force: true });
  for (const dir of writtenMigrations) fs.rmSync(dir, { recursive: true, force: true });
  if (backup) fs.renameSync(backup, moduleDir);
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

execSync("pnpm -s module:sync", { stdio: "inherit" });
execSync("pnpm -s module:deps", { stdio: "inherit" });
console.log(`Kuruldu: ${manifest.name} ${manifest.version} (${manifest.publisher})${backup ? ` — önceki sürüm yedeği: ${path.relative(ROOT, backup)}` : ""}`);
console.log("Sonraki adımlar: pnpm db:deploy && pnpm build (ve yeniden yayımlama). Modül, Modül Yönetimi'nden etkinleştirilir; EXTENSION modüllerin erişim istekleri yönetici onayı gerektirir.");
