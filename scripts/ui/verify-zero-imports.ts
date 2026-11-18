/**
 * Final W6 acceptance command; safe to add before the migration is complete.
 * Do not wire into CI until W3/W4/W5 waves have merged.
 *
 *   pnpm exec tsx scripts/ui/verify-zero-imports.ts
 */
import path from "node:path";
import { collectInventory } from "./heroui-inventory";

export function verifyZeroImports(root: string): { ok: boolean; count: number; report: string } {
  const report = collectInventory(root);
  const count = report.directImportFiles;
  if (count === 0) return { ok: true, count, report: "PASS: zero direct HeroUI imports in src/modules" };
  const details = report.files
    .slice(0, 30)
    .map(({ path, imports }) => "  - " + path + ": " + imports.join(", "))
    .join("\n");
  return {
    ok: false,
    count,
    report: "FAIL: " + count + " module files still directly import @heroui/react:\n" +
      details + (count > 30 ? "\n  ... +" + (count - 30) + " more" : ""),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const result = verifyZeroImports(process.cwd());
  console.log(result.report);
  if (!result.ok) process.exitCode = 1;
}
