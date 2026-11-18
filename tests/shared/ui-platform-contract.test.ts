import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { collectInventory, toMarkdown } from "../../scripts/ui/heroui-inventory";

const ROOT = process.cwd();

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

test("ERP UI semantic and motion foundations remain present", () => {
  const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
  const tokens = fs.readFileSync(
    path.join(ROOT, "src/shared/ui-platform/tokens.ts"),
    "utf8",
  );
  for (const token of [
    "--ui-surface-page",
    "--ui-surface-card",
    "--ui-surface-selected",
    "--ui-text-primary",
    "--ui-border-default",
  ]) {
    assert.ok(tokens.includes(token), `missing semantic contract ${token}`);
  }
  for (const token of ["--motion-fast", "--motion-normal", "--motion-slow"]) {
    assert.ok(css.includes(token), `missing motion token ${token}`);
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.erp-motion-enter/);
  assert.match(css, /\.erp-motion-selection/);
});

test("business modules do not create a parallel shared DataTable implementation", () => {
  const moduleFiles = walk(path.join(ROOT, "src/modules"));
  const forbidden = moduleFiles
    .filter((file) => /(?:^|\/)data-table\.(?:ts|tsx)$/.test(file.replace(/\\/g, "/")))
    .map((file) => path.relative(ROOT, file));
  assert.deepEqual(forbidden, []);
});

/**
 * W6 ratchet: the number of module files that import @heroui/react directly may only go down.
 * Lower W6_CEILING in the same PR that migrates files, and regenerate the tracked inventory
 * (`pnpm ui:inventory` → docs/ui/HEROUI_INVENTORY.md). Target: 0, then the ESLint rule becomes an error.
 */
const W6_CEILING = 102;

test("direct HeroUI dependency in modules may only shrink during adapter migration", () => {
  const inventory = collectInventory(ROOT);
  assert.ok(
    inventory.directImportFiles <= W6_CEILING,
    "Direct @heroui/react imports increased to " + inventory.directImportFiles +
      " (ceiling " + W6_CEILING + "); import from @/shared/components/kit instead.",
  );
  assert.equal(
    inventory.directImportFiles,
    W6_CEILING,
    "Migration progress detected: lower W6_CEILING to " + inventory.directImportFiles + " and run `pnpm ui:inventory`.",
  );
});

test("tracked HeroUI inventory (docs/ui/HEROUI_INVENTORY.md) is up to date", () => {
  const tracked = fs.readFileSync(path.join(ROOT, "docs/ui/HEROUI_INVENTORY.md"), "utf8");
  assert.equal(tracked, toMarkdown(collectInventory(ROOT)), "Run `pnpm ui:inventory` and commit docs/ui/HEROUI_INVENTORY.md.");
});

test("module bulk actions enforce permission, selection validation and audit", () => {
  const actionFiles = walk(path.join(ROOT, "src/modules")).filter((file) =>
    /\/actions\/bulk-[^/]+\.ts$/.test(file.replace(/\\/g, "/")),
  );
  assert.ok(actionFiles.length >= 2, "expected the members/documents bulk pilots");

  for (const file of actionFiles) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /createAction\s*\(/, path.relative(ROOT, file));
    assert.match(source, /permission\s*:/, path.relative(ROOT, file));
    assert.match(source, /parseBulkSelection\s*\(/, path.relative(ROOT, file));
    assert.match(source, /allowedFilterKeys\s*:/, path.relative(ROOT, file));
    assert.match(source, /audit\s*\(/, path.relative(ROOT, file));
  }
});

test("shared DataTable keeps accessible controlled selection wiring", () => {
  const table = fs.readFileSync(
    path.join(ROOT, "src/shared/components/data-table/data-table.tsx"),
    "utf8",
  );
  const bulkBar = fs.readFileSync(
    path.join(ROOT, "src/shared/components/data-table/data-table-bulk-action-bar.tsx"),
    "utf8",
  );

  assert.match(table, /selectionMode=\{selection \? "multiple" : "none"\}/);
  assert.match(table, /selectedKeys=/);
  assert.match(table, /onSelectionChange=/);
  assert.match(table, /aria-label=/);
  assert.match(bulkBar, /role="region"/);
  assert.match(bulkBar, /aria-label=\{tTable\("bulkActions"\)\}/);
  assert.match(bulkBar, /aria-busy=/);
});
