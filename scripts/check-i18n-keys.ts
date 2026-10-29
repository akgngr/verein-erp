/**
 * Statik i18n anahtar denetimi.
 *
 * `useTranslations("ns")` / `getTranslations("ns")` ile alınan çeviri fonksiyonlarına
 * SABİT anahtarla yapılan çağrıların (`t("key")`, `t.rich("key")`, `t.has` hariç)
 * messages/<locale>.json içinde gerçekten var olduğunu ve yaprak (string) olduğunu
 * doğrular. Dinamik anahtarlar (`t(\`x.${y}\`)`, `t(variable)`) atlanır.
 *
 * next-intl eksik anahtarda çalışma anında MISSING_MESSAGE hatası verir; bu script
 * aynı hatayı CI'da derleme öncesi yakalar.
 *
 * Kullanım: pnpm exec tsx scripts/check-i18n-keys.ts   (eksik varsa exit 1)
 */
import fs from "node:fs";
import path from "node:path";

import { createTranslator } from "next-intl";

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, "src");
const LOCALES = ["tr", "de"] as const;

type Messages = Record<string, unknown>;

export interface MissingKey {
  file: string;
  line: number;
  locale: string;
  key: string;
  reason: "missing" | "not-a-string";
}

function loadMessages(locale: string): Messages {
  return JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "messages", `${locale}.json`), "utf8"));
}

function lookup(messages: Messages, dottedKey: string): unknown {
  let current: unknown = messages;
  for (const part of dottedKey.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listSourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

interface TranslatorBinding {
  name: string;
  namespace: string;
  index: number;
}

/** Dosyadaki `const x = (await)? useTranslations|getTranslations("ns")` bağlamaları (konumlarıyla). */
function findTranslatorBindings(source: string): TranslatorBinding[] {
  const bindings: TranslatorBinding[] = [];
  const pattern =
    /const\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*(?:["'`]([^"'`$]*)["'`]|\{[^}]*?namespace\s*:\s*["'`]([^"'`$]*)["'`][^}]*\})?\s*\)/g;
  for (const match of source.matchAll(pattern)) {
    bindings.push({ name: match[1], namespace: match[2] ?? match[3] ?? "", index: match.index ?? 0 });
  }
  return bindings;
}

export function checkSource(file: string, source: string, messagesByLocale: Record<string, Messages>): MissingKey[] {
  const missing: MissingKey[] = [];
  const bindings = findTranslatorBindings(source);
  const names = [...new Set(bindings.map((binding) => binding.name))];
  for (const name of names) {
    const callPattern = new RegExp(`(?<![\\w.])${name}(?:\\.rich|\\.markup)?\\(\\s*["']([^"'\`$]+)["']`, "g");
    for (const call of source.matchAll(callPattern)) {
      const position = call.index ?? 0;
      // Çağrıdan önceki en yakın aynı adlı bağlama (farklı fonksiyonlardaki ayrı `t`'ler için).
      const binding = bindings.filter((b) => b.name === name && b.index < position).at(-1);
      if (!binding) continue;
      const key = binding.namespace ? `${binding.namespace}.${call[1]}` : call[1];
      const line = source.slice(0, position).split("\n").length;
      for (const locale of LOCALES) {
        const value = lookup(messagesByLocale[locale], key);
        if (value === undefined) missing.push({ file, line, locale, key, reason: "missing" });
        else if (typeof value !== "string") missing.push({ file, line, locale, key, reason: "not-a-string" });
      }
    }
  }
  return missing;
}

/**
 * ICU sözdizimi denetimi: her mesaj next-intl ile biçimlendirilir; "<Jahr>" gibi
 * etiket sanılan metinler veya kapanmamış süslü parantezler çalışma anında
 * sayfayı düşürür (INVALID_MESSAGE) — burada derleme öncesi yakalanır.
 */
export function checkMessageSyntax(locale: string, messages: Messages): string[] {
  const errors: string[] = [];
  const lookupText = (key: string) => String(lookup(messages, key) ?? "");
  const leafKeys = (node: unknown, prefix: string): string[] =>
    typeof node === "object" && node !== null
      ? Object.entries(node).flatMap(([key, value]) => leafKeys(value, prefix ? `${prefix}.${key}` : key))
      : [prefix];
  for (const key of leafKeys(messages, "")) {
    let failure: string | null = null;
    const t = createTranslator({
      locale,
      messages,
      onError: (error) => {
        failure = error.message;
      },
      getMessageFallback: () => "",
    });
    // Her yer tutucuya sayı verilir: hem {name} hem {count, plural, ...} biçimlenir.
    const values = Object.fromEntries(
      [...lookupText(key).matchAll(/\{\s*(\w+)/g)].map((match) => [match[1], 1]),
    );
    t(key as never, values as never);
    if (failure) errors.push(`[${locale}] ${key}: ${failure}`);
  }
  return errors;
}

function main() {
  const messagesByLocale = Object.fromEntries(LOCALES.map((locale) => [locale, loadMessages(locale)]));
  const problems = listSourceFiles(SRC_DIR).flatMap((file) =>
    checkSource(path.relative(ROOT_DIR, file), fs.readFileSync(file, "utf8"), messagesByLocale),
  );
  const syntaxErrors = LOCALES.flatMap((locale) => checkMessageSyntax(locale, messagesByLocale[locale]));
  if (syntaxErrors.length > 0) {
    console.error(`[i18n-keys] ${syntaxErrors.length} invalid ICU message(s):`);
    for (const error of syntaxErrors) console.error(`  ${error}`);
    process.exit(1);
  }

  if (problems.length === 0) {
    console.log("[i18n-keys] OK — all static translation keys exist in tr and de.");
    return;
  }

  console.error(`[i18n-keys] ${problems.length} missing/invalid translation key(s):`);
  for (const problem of problems) {
    console.error(`  ${problem.file}:${problem.line}  [${problem.locale}] ${problem.key} (${problem.reason})`);
  }
  process.exit(1);
}

const isDirectExecution = process.argv[1] && path.basename(process.argv[1]).startsWith("check-i18n-keys");
if (isDirectExecution) main();
