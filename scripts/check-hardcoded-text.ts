/**
 * Sabit (çevrilmemiş) arayüz metni denetimi.
 *
 * Kullanıcıya görünen metin modül/kabuk çevirisinden (`t("...")`) gelmelidir; aksi halde
 * Almanca arayüzde Türkçe görünür. Bu betik TS/TSX kaynaklarında şunları arar:
 *   - JSX metin düğümleri (`<p>Kaydet</p>`)
 *   - arayüz prop'larına verilen düz metinler (label, title, placeholder, description, …)
 *   - nesnelerde arayüz alanları (`{ label: "…" }`, `addToast({ title: "…" })`)
 *   - zod mesajları ve `ActionError("…")` — bunlar çeviri ANAHTARI olmalıdır
 *     (örn. "members.validation.lastNameRequired"; bkz. src/shared/i18n/message-key.ts)
 *
 * Kullanım: pnpm exec tsx scripts/check-hardcoded-text.ts [--json] [yol…]
 * Satır sonuna `// i18n-ignore` eklenen satırlar atlanır (marka adı, dil adı gibi).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_DIRS = ["src/app", "src/modules", "src/shared/components"];
/** Kullanıcıya görünmeyen ya da bilinçli olarak tek dilli dosyalar. */
const SKIP_FILE = [
  /\/messages\//,
  /\.test\.tsx?$/,
  /\/pdf\//, // PDF metinleri belge dilini (pdfLanguage) izler; ayrı ele alınır
  /\/handlers\//, // Excel/PDF dışa aktarma başlıkları; ayrı ele alınır
  /module\.config\.ts$/, // label/description yedek metinlerdir (çeviri nav/menu'den)
  /permissions-matrix\.ts$/,
];
const UI_PROPS = [
  "label", "title", "placeholder", "description", "aria-label", "emptyMessage", "emptyContent",
  "confirmLabel", "cancelLabel", "searchPlaceholder", "textValue", "message", "actionText",
  "primaryLabel", "category", "helperText", "errorMessage", "tooltip", "content", "alt",
];
const LETTERS = /[A-Za-zÇĞİÖŞÜçğıöşüÄÖÜäöüß]{2,}/;

export interface Finding {
  file: string;
  line: number;
  kind: "jsx-text" | "prop" | "object" | "validation";
  text: string;
}

function isIgnorable(text: string): boolean {
  const t = text.replace(/\$\{[^}]*\}/g, "").trim();
  if (!LETTERS.test(t)) return true;
  if (/^[a-z][\w-]*(\.[a-zA-Z0-9_]+)+$/.test(t)) return true; // çeviri anahtarı
  if (/^(https?:|\/|#|\.|@|[A-Z_]{2,}$)/.test(t)) return true; // yol, sabit adı
  if (/^[a-z]+([A-Z][a-z]+)*$/.test(t)) return true; // camelCase tanımlayıcı
  if (!/[a-zçğıöşüäöüß]{2,}/.test(t)) return true; // küçük harf yok: kısaltma, kod (GMT, VR 12345)
  if (/^[a-z0-9:/[\]._%-]+( [a-z0-9:/[\]._%-]+)*$/.test(t) && t.includes("-")) return true; // Tailwind sınıfları
  if (/^(Promise|Record|Array|Partial|Readonly)$/.test(t)) return true; // tip adları
  return false;
}

export function scanSource(file: string, source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split("\n");
  const propPattern = new RegExp(`(?:^|\\s)(${UI_PROPS.join("|")})=(["'])([^"']*)\\2`, "g");
  const objectPattern = new RegExp(`\\b(label|title|description|placeholder|emptyMessage|message)\\s*:\\s*(["'\`])([^"'\`]*)\\2`, "g");
  const validationPattern = /\.(?:min|max|length|regex|email|url|refine|nonempty|int|positive|nonnegative|gte|lte|gt|lt)\([^)]*?,\s*(["'`])([^"'`]+)\1|\bmessage\s*:\s*(["'`])([^"'`]+)\3|new ActionError\(\s*(["'`])([^"'`]+)\5/g;

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) return;
    if (raw.includes("i18n-ignore")) return;
    if (/console\.(log|warn|error|info)\(/.test(raw)) return;
    const at = (kind: Finding["kind"], text: string) =>
      findings.push({ file, line: index + 1, kind, text: text.trim().slice(0, 90) });

    for (const match of raw.matchAll(validationPattern)) {
      const text = match[2] ?? match[4] ?? match[6];
      if (text && !isIgnorable(text)) at("validation", text);
    }
    for (const match of raw.matchAll(propPattern)) {
      if (!isIgnorable(match[3])) at("prop", match[3]);
    }
    for (const match of raw.matchAll(objectPattern)) {
      if (!isIgnorable(match[3])) at("object", match[3]);
    }
    // Enum etiket tabloları: `BOARD: "Yönetim Kurulu"`
    for (const match of raw.matchAll(/\b[A-Z][A-Z0-9_]+\s*:\s*(["'`])([^"'`]+)\1/g)) {
      if (!isIgnorable(match[2]) && /\s|[çğıöşü]/.test(match[2])) at("object", match[2]);
    }
    // JSX ifadesindeki koşullu metinler: {x ? "Kaydet" : "Oluştur"}
    if (file.endsWith(".tsx")) {
      for (const match of raw.matchAll(/\?\s*(["'`])([^"'`]+)\1\s*:\s*(["'`])([^"'`]+)\3/g)) {
        for (const text of [match[2], match[4]]) if (!isIgnorable(text) && /\s|[çğıöşüÇĞİÖŞÜ]/.test(text)) at("jsx-text", text);
      }
    }
    // JSX metin düğümü: ">metin<" veya satırın tamamı düz metin (önceki satır ">" ile bitiyor)
    for (const match of raw.matchAll(/(.)>([^<>{}=;()]+)</g)) {
      if (match[1] === "=") continue; // "() => Promise<void>" gibi ok fonksiyonu tipi
      if (!isIgnorable(match[2]) && !/=>|&&|\|\|/.test(match[2])) at("jsx-text", match[2]);
    }
    const prev = (lines[index - 1] ?? "").trim();
    const next = (lines[index + 1] ?? "").trim();
    if (
      /^[^<>{}=;()"'`/]+$/.test(line) &&
      (prev.endsWith(">") && !prev.endsWith("=>")) &&
      (next.startsWith("<") || next.startsWith("{")) &&
      !isIgnorable(line) &&
      !/^(return|const|let|import|export|if|else|case|default)\b/.test(line)
    ) {
      at("jsx-text", line);
    }
  });
  return findings;
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  if (fs.statSync(dir).isFile()) return [dir];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const dirs = args.filter((arg) => !arg.startsWith("--"));
  const files = (dirs.length ? dirs : DEFAULT_DIRS)
    .flatMap((dir) => listFiles(path.join(ROOT, dir)))
    .map((file) => path.relative(ROOT, file).split(path.sep).join("/"))
    .filter((file) => !SKIP_FILE.some((pattern) => pattern.test(file)));
  const findings = files.flatMap((file) => scanSource(file, fs.readFileSync(path.join(ROOT, file), "utf8")));

  if (json) {
    console.log(JSON.stringify(findings, null, 1));
    return;
  }
  if (findings.length === 0) {
    console.log("[hardcoded-text] OK — no hard-coded UI text.");
    return;
  }
  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.kind}] ${finding.text}`);
  }
  console.error(`[hardcoded-text] ${findings.length} hard-coded UI text(s).`);
  process.exit(1);
}

const isDirectExecution = process.argv[1] && path.basename(process.argv[1]).startsWith("check-hardcoded-text");
if (isDirectExecution) main();
