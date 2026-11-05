import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * HeroUI bileşenleri yalnızca istemci bileşenlerinde çalışır. "use client" olmayan
 * bir dosyada (sunucu view'ı, page.tsx) `@heroui/react` kullanmak sayfayı 500 ile
 * düşürür ve derleyici bunu yakalamaz. Sunucu view'ları HeroUI'ye ihtiyaç duyarsa
 * components/ altında "use client" bir bileşen yazılır (ör. LinkButton, FormDrawerButton).
 */
const ALLOWED = new Set([
  "src/heroui.ts", // Tailwind eklentisi (heroui()), bileşen değil
]);

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

function startsWithUseClient(source: string): boolean {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const first = code.split("\n").map((line) => line.trim()).find(Boolean) ?? "";
  return /^["']use client["']/.test(first);
}

describe("HeroUI usage", () => {
  test('files importing @heroui/react start with "use client"', () => {
    const offenders = listSourceFiles(path.join(process.cwd(), "src"))
      .map((file) => path.relative(process.cwd(), file).split(path.sep).join("/"))
      .filter((file) => !ALLOWED.has(file))
      .filter((file) => {
        const source = fs.readFileSync(file, "utf8");
        return /from ["']@heroui\/react["']/.test(source) && !startsWithUseClient(source);
      });
    assert.deepEqual(offenders, []);
  });
});
