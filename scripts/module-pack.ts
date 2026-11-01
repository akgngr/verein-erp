/**
 * pnpm module:pack <modül-anahtarı> --key <yayıncı.private.pem> --publisher <yayıncı> [--migration <klasör>]... [--out dosya.vmod]
 * Modülü imzalı .vmod paketine çevirir. Modül önce `pnpm module:check`ten geçmelidir.
 */
import { createPrivateKey, createPublicKey } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildPackage, isSafePackagePath } from "../src/shared/marketplace/package";
import { validateModule } from "./validate-module";

const args = process.argv.slice(2);
const key = args[0];
const option = (name: string) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const migrations = args.flatMap((arg, index) => (arg === "--migration" ? [args[index + 1]] : []));
const keyFile = option("key");
const publisher = option("publisher");
if (!key || !keyFile || !publisher) {
  console.error("Kullanım: pnpm module:pack <modül> --key <yayıncı.private.pem> --publisher <yayıncı> [--migration <klasör>] [--out x.vmod]");
  process.exit(1);
}

const ROOT = process.cwd();
const moduleDir = path.join(ROOT, "src", "modules", key);
const validation = validateModule(key);
if (!validation.valid) {
  console.error(`Modül doğrulamadan geçmedi:\n  - ${validation.errors.join("\n  - ")}`);
  process.exit(1);
}

const files: Record<string, Buffer> = {};
const walk = (dir: string, prefix = "") => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Sembolik bağlantı pakete alınamaz: ${rel}`);
    if (entry.isDirectory()) walk(full, rel);
    else if (isSafePackagePath(rel)) files[rel] = fs.readFileSync(full);
    else console.warn(`[atlandı] ${rel}`);
  }
};
walk(moduleDir);
for (const name of migrations) {
  const sql = path.join(ROOT, "prisma", "schema", "migrations", name, "migration.sql");
  if (!fs.existsSync(sql)) throw new Error(`Migration bulunamadı: ${name}`);
  files[`migrations/${name}/migration.sql`] = fs.readFileSync(sql);
}

const configText = files["module.config.ts"].toString("utf8");
const pick = (re: RegExp) => configText.match(re)?.[1] ?? "";
const version = pick(/^\s*version:\s*["']([^"']+)["']/m);
const category = pick(/category:\s*["'](CORE|OFFICIAL|EXTENSION)["']/) as "CORE" | "OFFICIAL" | "EXTENSION";
const name = pick(/label:\s*["']([^"']+)["']/);
const description = pick(/description:\s*\n?\s*["']([^"']+)["']/);
const appVersion = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version as string;

const privateKey = createPrivateKey(fs.readFileSync(keyFile));
const publicKeyPem = createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString();
const data = buildPackage({ manifest: { key, version, name, description, publisher, category, minAppVersion: appVersion }, files, privateKey, publicKeyPem });
const out = option("out") ?? `${key}-${version}.vmod`;
fs.writeFileSync(out, data);
console.log(`Paket: ${out} (${Object.keys(files).length} dosya, ${(data.length / 1024).toFixed(0)} KB, sürüm ${version}, yayıncı ${publisher})`);
