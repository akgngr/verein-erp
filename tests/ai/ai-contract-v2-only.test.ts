/**
 * Asistan araç sözleşmesi: YALNIZ v2 (MODULE_DEVELOPMENT_GUIDE.md §9b — KATI KURAL).
 * - Modüllerde eski v1 yardımcıları (`aiTool(`, `defineModuleAi(`) kullanılamaz; araçlar `aiToolV2`,
 *   modül `defineModuleAiV2` ile tanımlanır (eylemler için `aiAction` serbest).
 * - Her `aiToolV2` bir `policy` taşır: `processing: "local_only"` ya da `"approved_provider"` +
 *   `modelDataClass` (aggregate | internal | pseudonymous). (Çalışma anında da AI_TOOL_DATA_CLASS_REQUIRED.)
 * - Her araç adı AI_TOOL_POLICY'de `serverReads` + `modelFields` ile kayıtlıdır (merkezi inceleme tablosu).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { AI_TOOL_POLICY } from "@/shared/data-policy";

const ROOT = path.join(process.cwd(), "src/modules");
const walk = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
const files = walk(ROOT).map((file) => ({ file: path.relative(process.cwd(), file), code: fs.readFileSync(file, "utf8") }));

const helperProvider = (block: string, code: string) => { const helper = /policy\s*:\s*([A-Za-z_]\w*)\(/.exec(block)?.[1]; return helper ? new RegExp(`const ${helper}\\s*=[^;]*processing:\\s*"approved_provider"`).test(code) : false; };

function blocks(code: string, opener: string): string[] {
  const out: string[] = [];
  let index = code.indexOf(opener);
  while (index >= 0) {
    let depth = 0;
    let end = index + opener.length - 1;
    for (; end < code.length; end++) {
      if (code[end] === "(") depth++;
      else if (code[end] === ")" && --depth === 0) break;
    }
    out.push(code.slice(index, end + 1));
    index = code.indexOf(opener, end);
  }
  return out;
}

test("modüllerde eski v1 araç sözleşmesi kullanılmaz", () => {
  const offenders = files.filter(({ code }) => /\baiTool\s*\(|\bdefineModuleAi\s*\(/.test(code)).map(({ file }) => file);
  assert.deepEqual(offenders, [], `v1 kullanımı (aiToolV2 / defineModuleAiV2'ye taşıyın):\n${offenders.join("\n")}`);
});

test("her aiToolV2 veri işleme sınıfını bildirir ve AI_TOOL_POLICY'de kayıtlıdır", () => {
  const problems: string[] = [];
  const policy = AI_TOOL_POLICY as Record<string, { serverReads?: readonly string[]; modelFields?: readonly string[] }>;
  for (const { file, code } of files) {
    for (const block of blocks(code, "aiToolV2(")) {
      const name = /name\s*:\s*["']([a-z_]+)["']/.exec(block)?.[1] ?? (/name\s*:\s*args\.name/.test(block) ? null : "?");
      const local = /processing["']?\s*:\s*["']local_only["']/.test(block);
      const provider = helperProvider(block, code) || /processing["']?\s*:\s*["']approved_provider["']/.test(block);
      // Dosya içi yardımcı (ör. `policy: policy(...)`) kullanılıyorsa, yardımcının kendisi sınıf + sağlayıcı bildirmelidir.
      const helper = /policy\s*:\s*([A-Za-z_]\w*)\(/.exec(block)?.[1];
      const helperOk = helper ? new RegExp(`const ${helper}\\s*=[^;]*processing:\\s*"approved_provider",\\s*modelDataClass`).test(code) : false;
      const dataClass = helperOk || /modelDataClass["']?\s*:\s*["'](aggregate|internal|pseudonymous)["']/.test(block);
      if (!local && !(provider && dataClass)) problems.push(`${file}: ${name ?? "(args.name)"} → processing:"local_only" ya da approved_provider + modelDataClass gerekli`);
      if (name && name !== "?" && !(policy[name]?.serverReads && policy[name]?.modelFields)) problems.push(`${file}: ${name} AI_TOOL_POLICY'de serverReads/modelFields ile kayıtlı değil`);
    }
  }
  assert.deepEqual(problems, []);
});
