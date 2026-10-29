import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * "use client" / "use server" yalnızca dosyanın İLK ifadesiyse geçerlidir. Önüne
 * bir import gelirse dizge sıradan bir ifadeye dönüşür: client bileşen sunucuda
 * çalışır, server action ise istemciye sızar — derleyici bunu sessizce kabul eder.
 */
function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

/** Yorumlar ve boş satırlar atlandıktan sonraki ilk satır. */
function firstStatement(source: string): string {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return withoutComments.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
}

describe("directives", () => {
  test('"use client" / "use server" is the first statement wherever it appears', () => {
    const offenders = listSourceFiles(path.join(process.cwd(), "src")).filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      if (!/^\s*["']use (client|server)["'];?\s*$/m.test(source)) return false;
      return !/^["']use (client|server)["']/.test(firstStatement(source));
    });
    assert.deepEqual(offenders.map((file) => path.relative(process.cwd(), file)), []);
  });
});
