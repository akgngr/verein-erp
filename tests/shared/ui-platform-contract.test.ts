import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

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

test("direct HeroUI dependency in modules may only shrink during adapter migration", () => {
  const moduleFiles = walk(path.join(ROOT, "src/modules")).filter((file) =>
    /\.(?:ts|tsx)$/.test(file),
  );
  const directImports = moduleFiles.filter((file) =>
    fs.readFileSync(file, "utf8").includes('from "@heroui/react"'),
  );

  // Baseline at ERP UI Platform hardening (2026-11-17). Reductions are welcome;
  // new direct framework imports must use shared UI patterns instead.
  assert.ok(
    directImports.length <= 168,
    "Direct @heroui/react imports increased to " + directImports.length +
      "; use shared UI patterns/adapters instead.",
  );
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
