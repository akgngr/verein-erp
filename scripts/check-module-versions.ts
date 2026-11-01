/**
 * Değişen modül = yeni modül sürümü. Ana dala (varsayılan origin/main; BASE_REF ile değiştirilebilir)
 * göre dosyası değişen her modülün releases.json en üst sürümü artmış olmalıdır.
 * Kullanım: pnpm exec tsx scripts/check-module-versions.ts
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

import { compareSemver } from "./validate-module";

const base = process.env.BASE_REF || "origin/main";
const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

let mergeBase: string;
try {
  mergeBase = git("merge-base", "HEAD", base);
} catch {
  console.log(`[module-versions] '${base}' bulunamadı; denetim atlandı.`);
  process.exit(0);
}

// Uygulama genel sürüm notları (system/changelog.json) modül değişikliği sayılmaz.
const APP_LEVEL_FILES = new Set(["src/modules/system/changelog.json"]);
const changed = git("diff", "--name-only", mergeBase, "HEAD")
  .split("\n")
  .filter((file) => file && !APP_LEVEL_FILES.has(file));
const modules = new Set(changed.map((file) => file.match(/^src\/modules\/([^/]+)\//)?.[1]).filter((key): key is string => Boolean(key)));

const topVersion = (text: string | null) => (text ? (JSON.parse(text).releases?.[0]?.version as string | undefined) : undefined);
const problems: string[] = [];
for (const key of modules) {
  const file = `src/modules/${key}/releases.json`;
  if (!fs.existsSync(`src/modules/${key}/module.config.ts`)) continue; // modül silinmiş
  let before: string | null = null;
  try {
    before = git("show", `${mergeBase}:${file}`);
  } catch {
    before = null; // yeni modül veya ilk releases.json
  }
  const oldVersion = topVersion(before);
  const newVersion = topVersion(fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);
  if (!newVersion) problems.push(`${key}: releases.json eksik.`);
  else if (oldVersion && compareSemver(newVersion, oldVersion) <= 0) {
    problems.push(`${key}: modül değişti ama sürümü artmadı (${oldVersion}). releases.json'a yeni sürüm ekleyin ve module.config.ts 'version'ı güncelleyin.`);
  }
}

if (problems.length) {
  console.error(`[module-versions] ${problems.length} sorun:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`[module-versions] OK — değişen modüller: ${[...modules].sort().join(", ") || "yok"}.`);
