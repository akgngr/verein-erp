/**
 * pnpm module:deps — modüllerin module.config.ts → dependencies alanlarını kök package.json'a uygular.
 *
 *  - Eksik paketleri `pnpm add --ignore-scripts` ile kurar (kurulum betikleri çalıştırılmaz).
 *  - Sahipliği package.json → moduleDependencies alanına yazar.
 *  - Hiçbir modülün bildirmediği, daha önce modül tarafından eklenmiş paketleri kaldırır.
 *  - İki modül aynı paketin uyumsuz sürümlerini isterse veya bir modül çekirdek paketin sürümünü
 *    değiştirmeye çalışırsa durur.
 *  - `--check`: hiçbir şey değiştirmez; yapılacakları yazar, eksik varsa 1 ile çıkar (CI için).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { corePackages, listModuleDeclarations, rangesCompatible, readRootPackage } from "../src/shared/modules/module-deps";

const checkOnly = process.argv.includes("--check");
const root = readRootPackage();
const owned = root.moduleDependencies ?? {};
const installed = { ...(root.dependencies ?? {}), ...(root.devDependencies ?? {}) };

const wanted = new Map<string, { range: string; owners: string[] }>();
const errors: string[] = [];
for (const [moduleKey, deps] of listModuleDeclarations()) {
  for (const [name, range] of Object.entries(deps)) {
    const current = wanted.get(name);
    if (!current) wanted.set(name, { range, owners: [moduleKey] });
    else if (!rangesCompatible(current.range, range)) errors.push(`'${name}': ${current.owners.join(", ")} '${current.range}' istiyor, ${moduleKey} '${range}' istiyor (uyumsuz).`);
    else current.owners.push(moduleKey);
  }
}
const core = corePackages();
for (const [name, { range, owners }] of wanted) {
  const isCore = core.has(name);
  if (isCore && installed[name] && !rangesCompatible(installed[name], range)) errors.push(`'${name}' çekirdek paketi (${installed[name]}); ${owners.join(", ")} '${range}' istiyor. Çekirdek sürümü modülden değiştirilemez.`);
}
if (errors.length) {
  console.error(`[module:deps] Çakışma:\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}

// Çekirdek paketler sahiplenilmez ve kaldırılmaz; diğerleri bildiren modüllere aittir.
const moduleOwned = [...wanted].filter(([name]) => !core.has(name));
const toAdd = moduleOwned.filter(([name, { range }]) => !installed[name] || installed[name] !== range).map(([name, { range }]) => `${name}@${range}`);
const toRemove = Object.keys(owned).filter((name) => !wanted.has(name) && !core.has(name));
const nextOwned = Object.fromEntries(moduleOwned.map(([name, { owners }]) => [name, owners.sort()]));
const ownershipChanged = JSON.stringify(nextOwned) !== JSON.stringify(owned);

if (!toAdd.length && !toRemove.length && !ownershipChanged) {
  console.log("[module:deps] Güncel; değişiklik yok.");
  process.exit(0);
}
console.log(`[module:deps] Eklenecek: ${toAdd.join(", ") || "-"} | Kaldırılacak: ${toRemove.join(", ") || "-"}`);
if (checkOnly) process.exit(1);

const run = (args: string[]) => execFileSync("pnpm", args, { stdio: "inherit" });
if (toRemove.length) run(["remove", ...toRemove]);
if (toAdd.length) run(["add", "--ignore-scripts", ...toAdd]);

const packagePath = path.join(process.cwd(), "package.json");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
if (Object.keys(nextOwned).length) pkg.moduleDependencies = nextOwned;
else delete pkg.moduleDependencies;
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log("[module:deps] Tamam. package.json ve pnpm-lock.yaml'ı commit'leyin.");
