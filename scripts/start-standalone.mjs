#!/usr/bin/env node
// #587: `pnpm start` — derlenmiş standalone sunucuyu (output: "standalone") yerelde ve CI'da başlatır.
//
// `next start` standalone çıktıyla çalışmaz (Next.js uyarır). Bu betik Dockerfile'daki düzeni taklit eder:
// - .next/static ve public klasörlerini standalone dizinine kopyalar (Docker'da COPY ile yapılır),
// - ortam değişkenlerini proje kökündeki .env / .env.local dosyalarından Next.js kuralıyla yükler
//   (standalone çıktıda .env taşınmaz; bkz. scripts/check-standalone.mjs),
// - göreli UPLOAD_DIR'i proje köküne göre mutlak yola çevirir (yüklemeler yeniden derlemede silinmesin),
// - server.js'i standalone dizininde başlatır (fontlar ve src/config process.cwd()'ye göre okunur).
//
// Üretimde (Docker/Coolify) bu betik kullanılmaz: imaj `node server.js` ile başlar.

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import nextEnv from "@next/env";

const root = process.cwd();
const distDir = process.env.NEXT_DIST_DIR || ".next";
const standalone = path.join(root, distDir, "standalone");
const server = path.join(standalone, "server.js");

if (!fs.existsSync(server)) {
  console.error(`[start] ${path.relative(root, server)} bulunamadı. Önce \`pnpm build\` çalıştırın.`);
  process.exit(1);
}

const copyDir = (from, to) => {
  if (!fs.existsSync(from)) return;
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
};
copyDir(path.join(root, distDir, "static"), path.join(standalone, distDir, "static"));
copyDir(path.join(root, "public"), path.join(standalone, "public"));

const { combinedEnv } = nextEnv.loadEnvConfig(root, false);
const env = { ...combinedEnv, ...process.env, NODE_ENV: "production" };
const uploadDir = env.UPLOAD_DIR || "./storage/uploads";
env.UPLOAD_DIR = path.isAbsolute(uploadDir) ? uploadDir : path.resolve(root, uploadDir);

const child = spawn(process.execPath, [server], { cwd: standalone, env, stdio: "inherit" });
const forward = (signal) => () => child.kill(signal);
process.once("SIGINT", forward("SIGINT"));
process.once("SIGTERM", forward("SIGTERM"));
child.once("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
