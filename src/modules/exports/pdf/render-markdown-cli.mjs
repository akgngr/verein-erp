/**
 * Alt işlem: stdin'den belge girdisini (JSON) okur, PDF'i stdout'a yazar. Worker tarafından düz `node` ile,
 * react-server koşulu OLMADAN çalıştırılır (exports/services/document-pipeline.ts).
 *
 * KARAR: @react-pdf'in alt paketleri yalnız ESM olarak yüklenebilir; tsx ise .tsx bileşenini CJS gibi
 * çalıştırıyor. Bu yüzden belge bileşeni esbuild (tsx'in bağımlılığı) ile ESM'e paketlenir; @react-pdf ve
 * react dışarıda bırakılır ve doğal ESM olarak yüklenir. Paket dosyası node_modules/.cache altında tutulur
 * (kaynak değişince yeniden üretilir). Veritabanına, sırlara ve ağa erişmez; yalnız verilen girdiyi çizer.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const require = createRequire(path.join(root, "package.json"));
const esbuild = createRequire(require.resolve("tsx"))("esbuild");

const sources = [
  path.join(root, "src/modules/exports/pdf/markdown-entry.tsx"),
  path.join(root, "src/shared/pdf/markdown-document.tsx"),
  path.join(root, "src/shared/markdown/parse.ts"),
  path.join(root, "src/shared/pdf/letterhead.tsx"),
  path.join(root, "src/shared/pdf/fonts.ts"),
];
const hash = createHash("sha256").update(sources.map((file) => readFileSync(file)).join("\0")).digest("hex").slice(0, 16);
const cacheDir = path.join(root, "node_modules/.cache/exports");
const bundle = path.join(cacheDir, `markdown-${hash}.mjs`);
if (!existsSync(bundle)) {
  mkdirSync(cacheDir, { recursive: true });
  const result = await esbuild.build({
    entryPoints: [sources[0]],
    bundle: true,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    write: false,
    tsconfig: path.join(root, "tsconfig.json"),
    external: ["@react-pdf/*", "react", "react/*"],
    logLevel: "silent",
  });
  writeFileSync(bundle, result.outputFiles[0].text);
}

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
try {
  const { renderMarkdown } = await import(pathToFileURL(bundle).href);
  process.stdout.write(await renderMarkdown(JSON.parse(Buffer.concat(chunks).toString("utf8"))));
} catch (error) {
  process.stderr.write(String(error instanceof Error ? error.stack ?? error.message : error));
  process.exit(1);
}
