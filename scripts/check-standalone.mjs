#!/usr/bin/env node
// #587: Standalone sunucu paketinin (.next/standalone) içeriğini doğrular. `pnpm build` sonunda çalışır.
//
// 1. Next.js'in standalone'a kendiliğinden kopyaladığı `.env` / `.env.production` dosyalarını siler:
//    sırlar (AUTH_SECRET, DATABASE_URL) derleme çıktısında taşınmaz. Sunucu ortam değişkenlerini
//    konteynerden (Docker/Coolify) veya `pnpm start` üzerinden (scripts/start-standalone.mjs) alır.
// 2. Paket yasak yollar içeriyorsa (kaynak kod, testler, belgeler, yerel yüklemeler) veya izin verilen
//    boyutu aşıyorsa çıkış kodu 1 ile durur. Bu, bir dinamik dosya yolunun Turbopack'e projenin
//    tamamını yeniden izletmesini (bkz. shared/files/storage.ts) CI'da yakalar.
//
// Düz Node.js (ESM); bağımlılık yok. Kullanım: `node scripts/check-standalone.mjs [--max-mb=360]`.

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const distDir = process.env.NEXT_DIST_DIR || ".next";
const standalone = path.join(root, distDir, "standalone");
const maxMbArg = process.argv.find((arg) => arg.startsWith("--max-mb="));
const MAX_MB = Number(maxMbArg?.split("=")[1] ?? process.env.STANDALONE_MAX_MB ?? 360);

/** Standalone içinde bulunmaması gereken yollar (standalone köküne göre). */
const FORBIDDEN_DIRS = ["tests", "docs", "website", "storage", ".git", "coverage", "theme-preview"];
/** `src/` altında yalnız bu önekler bulunabilir (çalışma anında okunan varlıklar). */
const ALLOWED_SRC_PREFIXES = [
  "src/shared/pdf/fonts/",
  "src/modules/meetings/assets/fonts/",
  "src/config/",
  // Kodda adıyla çağrılan alt işlem PDF çizicileri (document-pipeline.ts, evidence-pdf-input.ts).
  "src/modules/exports/pdf/render-markdown-cli.mjs",
  "src/modules/online-forms/pdf/render-cli.mjs",
];

if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error(`[check-standalone] ${path.relative(root, standalone)}/server.js yok; önce \`next build\` çalışmalı.`);
  process.exit(1);
}

// 1) Ortam dosyalarını kaldır.
for (const name of fs.readdirSync(standalone)) {
  if (/^\.env(\..+)?$/.test(name)) {
    fs.rmSync(path.join(standalone, name), { force: true });
    console.info(`[check-standalone] ${name} standalone çıktıdan kaldırıldı (sırlar derleme çıktısında taşınmaz).`);
  }
}

// 2) İçeriği tara.
const problems = [];
let totalBytes = 0;
let fileCount = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(standalone, full).split(path.sep).join("/");
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (!rel.includes("/") && FORBIDDEN_DIRS.includes(entry.name)) {
        problems.push(`${rel}/ (yasak klasör)`);
        continue;
      }
      walk(full);
      continue;
    }
    fileCount += 1;
    totalBytes += fs.statSync(full).size;
    if (rel.startsWith("src/") && !ALLOWED_SRC_PREFIXES.some((prefix) => rel.startsWith(prefix))) {
      problems.push(`${rel} (kaynak dosya; çalışma anında gerekiyorsa next.config.ts outputFileTracingIncludes'a eklenmeli)`);
    }
  }
}
walk(standalone);

const totalMb = totalBytes / 1024 / 1024;
console.info(`[check-standalone] ${fileCount} dosya, ${totalMb.toFixed(1)} MB (sınır ${MAX_MB} MB).`);

if (totalMb > MAX_MB) problems.push(`toplam boyut ${totalMb.toFixed(1)} MB > ${MAX_MB} MB`);

if (problems.length) {
  const shown = problems.slice(0, 25);
  console.error(`[check-standalone] Standalone paket beklenmeyen içerik taşıyor (${problems.length}):\n  - ${shown.join("\n  - ")}`);
  if (problems.length > shown.length) console.error(`  … ve ${problems.length - shown.length} tane daha`);
  console.error("[check-standalone] Olası neden: dinamik bir fs/path çağrısı Turbopack'e projenin tamamını izletti. Çağrıya /* turbopackIgnore: true */ ekleyin.");
  process.exit(1);
}
console.info("[check-standalone] OK");
